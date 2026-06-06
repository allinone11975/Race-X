/**
 * RACE-X Provider Health Check
 * ─────────────────────────────
 * Pings all registered providers, measures latency, records health snapshots.
 * Can be triggered manually (admin) or via cron-like scheduled call.
 * Results stored in provider_health_log — feeds the Health Monitor UI.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Health probe endpoints per provider — lightweight ping targets
const PROVIDER_PROBES: Record<string, { url: string; expectedStatus?: number }> = {
  groq_llama:      { url: 'https://api.groq.com/openai/v1/models',                         expectedStatus: 200 },
  huggingface:     { url: 'https://router.huggingface.co',                                  expectedStatus: 200 },
  stability:       { url: 'https://api.stability.ai/v1/engines/list',                       expectedStatus: 401 }, // 401 = reachable, not authed
  elevenlabs:      { url: 'https://api.elevenlabs.io/v1/voices',                            expectedStatus: 401 },
  mubert:          { url: 'https://api-b2b.mubert.com/v2/GetServiceAccess',                 expectedStatus: 200 },
  openai:          { url: 'https://api.openai.com/v1/models',                               expectedStatus: 401 },
  cloudinary:      { url: 'https://api.cloudinary.com/v1_1/ping',                          expectedStatus: 200 },
  supabase_db:     { url: `${SUPABASE_URL}/rest/v1/`,                                       expectedStatus: 200 },
};

interface HealthResult {
  provider_name: string;
  status: 'online' | 'degraded' | 'offline';
  latency_ms: number;
  success_rate: number;
  error_count: number;
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const url = new URL(req.url);
    const providerFilter = url.searchParams.get('provider');

    const probes = providerFilter
      ? Object.entries(PROVIDER_PROBES).filter(([name]) => name === providerFilter)
      : Object.entries(PROVIDER_PROBES);

    // Run all probes concurrently
    const results = await Promise.allSettled(
      probes.map(([name, probe]) => probeProvider(name, probe.url, probe.expectedStatus ?? 200))
    );

    const healthResults: HealthResult[] = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        provider_name: probes[i][0],
        status:        'offline',
        latency_ms:    0,
        success_rate:  0,
        error_count:   1,
        message:       'Probe exception',
      };
    });

    // Persist all results to health log
    await client.from('provider_health_log').insert(
      healthResults.map(r => ({
        provider_name: r.provider_name,
        status:        r.status,
        latency_ms:    r.latency_ms,
        success_rate:  r.success_rate,
        error_count:   r.error_count,
      }))
    );

    // Also update feature_registry status for providers we manage
    await Promise.allSettled(
      healthResults
        .filter(r => r.status === 'offline')
        .map(r =>
          client.from('feature_registry')
            .update({ status: 'disabled', updated_at: new Date().toISOString() })
            .eq('registry_type', 'provider')
            .eq('name', r.provider_name)
        )
    );
    await Promise.allSettled(
      healthResults
        .filter(r => r.status === 'online')
        .map(r =>
          client.from('feature_registry')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('registry_type', 'provider')
            .eq('name', r.provider_name)
        )
    );

    // Summary stats
    const online   = healthResults.filter(r => r.status === 'online').length;
    const degraded = healthResults.filter(r => r.status === 'degraded').length;
    const offline  = healthResults.filter(r => r.status === 'offline').length;
    const avgLat   = healthResults.reduce((s, r) => s + r.latency_ms, 0) / (healthResults.length || 1);

    return new Response(JSON.stringify({
      success: true,
      summary: { online, degraded, offline, avg_latency_ms: Math.round(avgLat), total: healthResults.length },
      results: healthResults,
      checked_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('provider-health-check error:', err);
    return new Response(JSON.stringify({ error: 'Health check failed', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function probeProvider(
  name: string,
  url:  string,
  expectedStatus: number
): Promise<HealthResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method:  'GET',
      signal:  AbortSignal.timeout(5000), // 5s timeout per probe
      headers: { 'User-Agent': 'RACE-X-HealthMonitor/1.0' },
    });
    const latency = Date.now() - start;
    const ok = res.status === expectedStatus || (res.status >= 200 && res.status < 500);
    return {
      provider_name: name,
      status:        latency > 3000 ? 'degraded' : ok ? 'online' : 'offline',
      latency_ms:    latency,
      success_rate:  ok ? 100 : 0,
      error_count:   ok ? 0 : 1,
      message:       `HTTP ${res.status}`,
    };
  } catch (err) {
    const latency = Date.now() - start;
    const isTimeout = String(err).includes('TimeoutError') || String(err).includes('timeout');
    return {
      provider_name: name,
      status:        isTimeout ? 'degraded' : 'offline',
      latency_ms:    latency,
      success_rate:  0,
      error_count:   1,
      message:       isTimeout ? 'Timeout (>5s)' : `Error: ${String(err).slice(0, 80)}`,
    };
  }
}
