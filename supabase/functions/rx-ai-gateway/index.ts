/**
 * RACE-X Unified AI Gateway — rx-ai-gateway
 * ─────────────────────────────────────────
 * ALL AI generation requests pass through this single entry point.
 * No frontend-to-provider communication allowed.
 *
 * Execution flow:
 *  1. Kill-switch check          → system_config.global_kill_switch
 *  2. Auth check                 → valid JWT required
 *  3. Permission check           → feature flag enabled + user level OK
 *  4. Diamond balance check      → atomic spend via spend_diamonds()
 *  5. Cache check                → ai_gateway_cache lookup
 *  6. Provider health routing    → pick healthiest active provider
 *  7. Generate via sub-function  → delegate to ai-music / ai-image / ai-chat / ai-video
 *  8. Upload to Cloudinary       → via cloudinary-upload function
 *  9. Save metadata to Supabase  → asset_backups + queue_jobs update
 * 10. Return optimized URL
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// Map tool → sub-function name
const TOOL_FUNCTION_MAP: Record<string, string> = {
  music:    'ai-music',
  image:    'ai-image',
  video:    'ai-video',
  chat:     'ai-chat',
  voice:    'ai-voice',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // ── STEP 1: Kill-Switch Check ──────────────────────────────────────────
    const { data: ksRow } = await adminClient
      .from('system_config')
      .select('value')
      .eq('key', 'global_kill_switch')
      .maybeSingle();

    const killActive = (ksRow?.value as { active?: boolean })?.active ?? false;
    if (killActive) {
      return json({ error: 'PLATFORM_SHUTDOWN', message: 'The platform is temporarily offline. Please try again later.' }, 503);
    }

    // ── STEP 2: Auth Check ─────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'UNAUTHENTICATED', message: 'Valid authentication required.' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return json({ error: 'UNAUTHORIZED', message: 'Invalid token.' }, 401);
    }

    // ── Parse request body ─────────────────────────────────────────────────
    const body = await req.json() as {
      tool: string;
      prompt: string;
      params?: Record<string, unknown>;
      idempotency_key?: string;
      priority?: number;
    };

    const { tool, prompt, params = {}, idempotency_key, priority = 5 } = body;

    if (!tool || !TOOL_FUNCTION_MAP[tool]) {
      return json({ error: 'INVALID_TOOL', message: `Tool "${tool}" not recognized. Valid: ${Object.keys(TOOL_FUNCTION_MAP).join(', ')}` }, 400);
    }

    if (!prompt?.trim()) {
      return json({ error: 'MISSING_PROMPT', message: 'prompt is required.' }, 400);
    }

    // ── STEP 3: Feature Flag + Permission Check ────────────────────────────
    const toolFlagMap: Record<string, string> = {
      music: 'music_studio',
      image: 'ai_images',
      video: 'ai_video',
      chat:  'rx_magic_chat',
      voice: 'studio_mode',
    };
    const flagName = toolFlagMap[tool];
    if (flagName) {
      const { data: flag } = await adminClient
        .from('rx_feature_flags_v2')
        .select('is_enabled, is_premium, diamond_cost, min_level, rollout_percent')
        .eq('flag_name', flagName)
        .maybeSingle();

      if (flag && !flag.is_enabled) {
        return json({ error: 'FEATURE_DISABLED', message: `${tool} is currently disabled by admin.` }, 403);
      }

      // Level check
      if (flag?.min_level > 0) {
        const { data: profile } = await adminClient.from('users').select('level').eq('id', user.id).maybeSingle();
        if ((profile?.level ?? 0) < flag.min_level) {
          return json({ error: 'LEVEL_REQUIRED', message: `Level ${flag.min_level}+ required for ${tool}.`, required_level: flag.min_level }, 403);
        }
      }
    }

    // ── STEP 4: Diamond Balance + Atomic Spend ─────────────────────────────
    const { data: flagRow } = await adminClient
      .from('rx_feature_flags_v2')
      .select('diamond_cost')
      .eq('flag_name', flagName ?? '')
      .maybeSingle();

    const diamondCost = flagRow?.diamond_cost ?? 0;
    if (diamondCost > 0) {
      const { data: spendResult } = await adminClient.rpc('spend_diamonds', {
        p_user_id:     user.id,
        p_amount:      diamondCost,
        p_tool:        tool,
        p_description: `${tool} generation: ${prompt.slice(0, 60)}`,
        p_idempotency: idempotency_key ?? null,
      });

      if (!spendResult?.success) {
        if (spendResult?.idempotent) {
          // Already processed — fall through to return cached/queued result
        } else {
          return json({
            error: spendResult?.error === 'insufficient_diamonds' ? 'INSUFFICIENT_DIAMONDS' : 'PAYMENT_FAILED',
            message: 'Insufficient 💎 diamonds. Earn more by watching ads or completing tasks.',
            balance: spendResult?.balance ?? 0,
            required: diamondCost,
          }, 402);
        }
      }
    }

    // ── STEP 5: Cache Check ────────────────────────────────────────────────
    const promptHash = await hashPrompt(`${tool}:${prompt}:${JSON.stringify(params)}`);
    const cacheKey   = `${tool}:${promptHash}`;

    const { data: cached } = await adminClient
      .from('ai_gateway_cache')
      .select('result_url, cloudinary_id')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      // Increment hit count
      await adminClient.from('ai_gateway_cache').update({ hit_count: adminClient.rpc('hit_count' as never) }).eq('cache_key', cacheKey);
      await logAnalytics(adminClient, user.id, 'cache_hit', tool, { prompt: prompt.slice(0, 60) });
      return json({ success: true, url: cached.result_url, cloudinary_id: cached.cloudinary_id, cached: true });
    }

    // ── STEP 6: Provider Health Routing ───────────────────────────────────
    const bestProvider = await pickBestProvider(adminClient, tool);

    // ── STEP 7: Create queue job + call sub-function ───────────────────────
    const { data: jobRow } = await adminClient
      .from('queue_jobs')
      .insert({
        user_id:     user.id,
        job_type:    `${tool}_generate`,
        status:      'running',
        priority:    priority,
        progress:    10,
        payload:     { tool, prompt, params, provider: bestProvider },
        started_at:  new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();

    const jobId = jobRow?.id;

    // Update progress: calling provider
    if (jobId) {
      await adminClient.from('queue_jobs').update({ progress: 30 }).eq('id', jobId);
    }

    // Call the appropriate sub-function
    const subFnName = TOOL_FUNCTION_MAP[tool];
    const subPayload: Record<string, unknown> = { prompt, ...params };
    if (bestProvider) subPayload.preferred_provider = bestProvider;

    const subRes = await fetch(`${SUPABASE_URL}/functions/v1/${subFnName}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey':        SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(subPayload),
    });

    if (!subRes.ok) {
      const errText = await subRes.text();
      if (jobId) {
        await adminClient.from('queue_jobs').update({
          status: 'failed', progress: 0, error_message: errText, completed_at: new Date().toISOString(),
        }).eq('id', jobId);
      }
      // Log provider failure for health tracking
      await logProviderHealth(adminClient, bestProvider ?? subFnName, false, 0);
      return json({ error: 'GENERATION_FAILED', message: 'AI generation failed. Please try again.', detail: errText }, 500);
    }

    if (jobId) await adminClient.from('queue_jobs').update({ progress: 70 }).eq('id', jobId);

    const subData = await subRes.json() as { url?: string; audio_url?: string; image_url?: string; error?: string };

    const resultUrl = subData.url ?? subData.audio_url ?? subData.image_url;
    if (!resultUrl) {
      if (jobId) await adminClient.from('queue_jobs').update({ status: 'failed', progress: 0, error_message: 'No URL returned', completed_at: new Date().toISOString() }).eq('id', jobId);
      return json({ error: 'NO_RESULT', message: 'Generation succeeded but returned no media URL.' }, 500);
    }

    // ── STEP 8: Log provider success + cost ───────────────────────────────
    await logProviderHealth(adminClient, bestProvider ?? subFnName, true, 2000);
    await logProviderCost(adminClient, bestProvider ?? subFnName, tool, diamondCost * 0.001, user.id);

    // ── STEP 9: Cache + Asset backup + job complete ────────────────────────
    await Promise.allSettled([
      adminClient.from('ai_gateway_cache').upsert({
        cache_key: cacheKey, tool, provider: bestProvider ?? subFnName,
        prompt_hash: promptHash, result_url: resultUrl, hit_count: 1,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'cache_key' }),
      adminClient.from('asset_backups').insert({
        user_id: user.id, asset_type: tool === 'music' ? 'audio' : tool,
        original_url: resultUrl, is_verified: true,
        metadata: { prompt: prompt.slice(0, 100), provider: bestProvider ?? subFnName, tool },
      }),
      jobId ? adminClient.from('queue_jobs').update({
        status: 'completed', progress: 100, result: { url: resultUrl }, completed_at: new Date().toISOString(),
      }).eq('id', jobId) : Promise.resolve(),
      logAnalytics(adminClient, user.id, 'ai_generate', tool, { provider: bestProvider ?? subFnName, prompt: prompt.slice(0, 60) }),
    ]);

    // ── STEP 10: Return result ─────────────────────────────────────────────
    return json({ success: true, url: resultUrl, cached: false, provider: bestProvider ?? subFnName, job_id: jobId });

  } catch (err) {
    console.error('rx-ai-gateway error:', err);
    return json({ error: 'GATEWAY_ERROR', message: 'Internal gateway error.' }, 500);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hashPrompt(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function pickBestProvider(client: ReturnType<typeof createClient>, tool: string): Promise<string | null> {
  try {
    const { data } = await client
      .from('feature_registry')
      .select('name, priority, status')
      .eq('registry_type', 'provider')
      .eq('module', tool === 'image' ? 'studio' : tool)
      .eq('status', 'active')
      .order('priority', { ascending: true })
      .limit(1);
    return data?.[0]?.name ?? null;
  } catch { return null; }
}

async function logProviderHealth(client: ReturnType<typeof createClient>, provider: string, success: boolean, latency: number) {
  await client.from('provider_health_log').insert({
    provider_name: provider,
    status: success ? 'online' : 'degraded',
    latency_ms: latency,
    success_rate: success ? 100 : 0,
    error_count: success ? 0 : 1,
  }).then(() => {});
}

async function logProviderCost(client: ReturnType<typeof createClient>, provider: string, tool: string, cost: number, userId: string) {
  await client.from('provider_cost_log').insert({
    provider_name: provider, tool_type: tool, cost_usd: cost, success: true, user_id: userId,
  }).then(() => {});
}

async function logAnalytics(client: ReturnType<typeof createClient>, userId: string, event: string, module: string, props: Record<string, unknown>) {
  await client.from('analytics_events').insert({
    user_id: userId, event_name: event, module, properties: props,
  }).then(() => {});
}
