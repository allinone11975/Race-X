/**
 * RACE-X AI Gateway — Voice Generation
 * Provider: HuggingFace (facebook/mms-tts-eng)
 * Endpoint: router.huggingface.co/hf-inference (new router — better reachability from Deno edge)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HF_BASE    = 'https://router.huggingface.co/hf-inference/models';
const MODEL_VOICE = 'facebook/mms-tts-eng'; // mms-tts-eng: no voice_preset param needed

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

    const { text, voice_preset = 'v2/en_speaker_6' } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Truncate to safe limit for bark
    const truncatedText = text.slice(0, 500);

    const hfResponse = await fetch(`${HF_BASE}/${MODEL_VOICE}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: truncatedText,
        // mms-tts-eng uses plain inputs — no parameters block needed
      }),
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.error('HuggingFace voice error:', hfResponse.status, errText);

      if (hfResponse.status === 503) {
        return new Response(JSON.stringify({
          error: 'Model loading',
          message: 'Voice model is warming up. Please retry in 30 seconds.',
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
      model: MODEL_VOICE,
      voice_preset,
      text: truncatedText,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const msg: string = error instanceof Error ? error.message : String(error);
    console.error('ai-voice error:', msg);
    const isDns = msg.includes('dns error') || msg.includes('No address associated');
    return new Response(JSON.stringify({
      error: isDns ? 'Network connectivity error — HuggingFace unreachable from edge runtime' : msg,
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
