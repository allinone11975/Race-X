/**
 * RACE-X AI Gateway — Video Generation
 * Provider: HuggingFace (ali-vilab/text-to-video-ms-1.7b for short clips)
 * Route: /api/ai/video
 * Note: Video generation is async and can take 60-120s
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Using zeroscope for short 3s video clips
const HF_VIDEO_URL = 'https://api-inference.huggingface.co/models/cerspense/zeroscope_v2_576w';

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

    const { prompt, num_frames = 24, fps = 8 } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const enhancedPrompt = `${prompt}, cinematic, high quality, dynamic motion, smooth`;

    const hfResponse = await fetch(HF_VIDEO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: enhancedPrompt,
        parameters: {
          num_frames,
          fps,
          num_inference_steps: 25,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.error('HuggingFace video error:', errText);

      if (hfResponse.status === 503) {
        return new Response(JSON.stringify({
          error: 'Model loading',
          message: 'Video model is warming up. This can take 60-90 seconds on first run.',
          retry_after: 60,
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

    const videoBuffer = await hfResponse.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(videoBuffer)));
    const contentType = hfResponse.headers.get('content-type') || 'video/mp4';
    const dataUrl = `data:${contentType};base64,${base64}`;

    return new Response(JSON.stringify({
      video_url: dataUrl,
      format: 'base64',
      content_type: contentType,
      provider: 'huggingface',
      model: 'cerspense/zeroscope_v2_576w',
      prompt: enhancedPrompt,
      num_frames,
      fps,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ai-video error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
