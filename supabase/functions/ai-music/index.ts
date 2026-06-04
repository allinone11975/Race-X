/**
 * RACE-X AI Gateway — Music Generation
 * Provider: HuggingFace (facebook/musicgen-stereo-small)
 * Endpoint: router.huggingface.co/hf-inference (new router — better reachability from Deno edge)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use the HF inference router — resolves DNS correctly from Deno edge runtimes
const HF_BASE = 'https://router.huggingface.co/hf-inference/models';
const MODEL_MUSIC  = 'facebook/musicgen-stereo-small';
const MODEL_MELODY = 'facebook/musicgen-stereo-small';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const hfToken = Deno.env.get('HF_API_TOKEN');
    if (!hfToken) {
      return new Response(JSON.stringify({ error: 'HF_API_TOKEN not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, duration = 10, mode = 'music' } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const modelId  = mode === 'melody' ? MODEL_MELODY : MODEL_MUSIC;
    const modelUrl = `${HF_BASE}/${modelId}`;

    const hfResponse = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: Math.min(duration * 50, 500),
        },
      }),
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.error('HuggingFace music error:', hfResponse.status, errText);

      if (hfResponse.status === 503) {
        return new Response(JSON.stringify({
          error: 'Model loading',
          message: 'Music model is warming up. Please retry in 30 seconds.',
          retry_after: 30,
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'HuggingFace API error', details: errText }), {
        status: hfResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const audioBuffer = await hfResponse.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const contentType = hfResponse.headers.get('content-type') || 'audio/wav';
    const dataUrl = `data:${contentType};base64,${base64}`;

    return new Response(JSON.stringify({
      audio_url: dataUrl,
      format: 'base64',
      content_type: contentType,
      provider: 'huggingface',
      model: modelId,
      mode,
      prompt,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const msg: string = error instanceof Error ? error.message : String(error);
    console.error('ai-music error:', msg);
    // Surface DNS / connectivity errors clearly
    const isDns = msg.includes('dns error') || msg.includes('No address associated');
    return new Response(JSON.stringify({
      error: isDns ? 'Network connectivity error — HuggingFace unreachable from edge runtime' : msg,
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
