/**
 * RACE-X  ·  music-generate Edge Function
 * Routes to 12 providers via Railway Nexus Bridge
 * Self-healing: on failure returns error for client fallback logic
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Provider → Railway endpoint mapping
const PROVIDER_ENDPOINTS: Record<string, string> = {
  Suno:        '/music/suno/generate',
  Udio:        '/music/udio/generate',
  MiniMax:     '/music/minimax/generate',
  Mubert:      '/music/mubert/generate',
  ElevenLabs:  '/music/elevenlabs/generate',
  StableAudio: '/music/stable-audio/generate',
  Soundverse:  '/music/soundverse/generate',
  Boomy:       '/music/boomy/generate',
  AIVA:        '/music/aiva/generate',
  Sonauto:     '/music/sonauto/generate',
  Soundful:    '/music/soundful/generate',
  MubertAPI:   '/music/mubert-api/generate',
};

const RAILWAY_BASE = Deno.env.get('RAILWAY_NEXUS_URL') ?? 'https://race-x-nexus-production.up.railway.app';
const RAILWAY_KEY  = Deno.env.get('RAILWAY_API_KEY') ?? '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const { prompt, provider, duration_sec = 30, mood, style, userId } = body;

    if (!prompt || !provider || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const endpoint = PROVIDER_ENDPOINTS[provider];
    if (!endpoint) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown provider: ${provider}` }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Route to Railway
    const railRes = await fetch(`${RAILWAY_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RAILWAY_KEY}`,
        'X-RX-Provider': provider,
      },
      body: JSON.stringify({ prompt, duration_sec, mood, style }),
    });

    if (!railRes.ok) {
      const errText = await railRes.text();
      console.error(`[music-generate] ${provider} error ${railRes.status}: ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `${provider} returned ${railRes.status}` }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const railData = await railRes.json();
    const audioUrl: string | null = railData.audio_url ?? null;

    // Save track to DB
    const title = `${style ? style + ' · ' : ''}${prompt.slice(0, 40)}${prompt.length > 40 ? '…' : ''}`;
    const { data: trackRow, error: dbErr } = await supabase
      .from('music_tracks')
      .insert({
        user_id: userId,
        title,
        prompt,
        provider,
        audio_url: audioUrl,
        duration_sec,
        diamond_cost: 5,
        moderation_pass: true,
        generation_meta: { mood, style, raw_response: railData },
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (dbErr) console.error('[music-generate] DB insert error:', dbErr.message);

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: audioUrl,
        provider,
        track_id: trackRow?.id ?? null,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[music-generate] Fatal:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
