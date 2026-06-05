/**
 * RACE-X AI Gateway — Image Generation
 * Provider: HuggingFace (black-forest-labs/FLUX.1-schnell)
 * Endpoint: router.huggingface.co/hf-inference (new router — better reachability from Deno edge)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HF_BASE = 'https://router.huggingface.co/hf-inference/models';
const MODEL_IMAGE = 'black-forest-labs/FLUX.1-schnell';

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

    const { prompt, negative_prompt, width = 1024, height = 1024, num_inference_steps = 30 } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const enhancedPrompt = `${prompt}, ultra HD, photorealistic, cinematic lighting, 8k resolution, professional photography`;

    const hfResponse = await fetch(`${HF_BASE}/${MODEL_IMAGE}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: enhancedPrompt,
        parameters: {
          negative_prompt: negative_prompt || 'blurry, low quality, distorted, watermark',
          width,
          height,
          num_inference_steps: Math.min(num_inference_steps, 4),
          guidance_scale: 0,
        },
      }),
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.error('HuggingFace image error:', hfResponse.status, errText);

      if (hfResponse.status === 503) {
        return new Response(JSON.stringify({
          error: 'Model loading',
          message: 'HuggingFace model is warming up. Please retry in 20 seconds.',
          retry_after: 20,
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

    const imageBuffer = await hfResponse.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return new Response(JSON.stringify({
      image_url: dataUrl,
      format: 'base64',
      provider: 'huggingface',
      model: MODEL_IMAGE,
      prompt: enhancedPrompt,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const msg: string = error instanceof Error ? error.message : String(error);
    console.error('ai-image error:', msg);
    const isDns = msg.includes('dns error') || msg.includes('No address associated');
    return new Response(JSON.stringify({
      error: isDns ? 'Network connectivity error — HuggingFace unreachable from edge runtime' : msg,
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
