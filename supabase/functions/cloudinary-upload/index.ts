/**
 * RACE-X — Cloudinary Media Upload
 * Handles signed uploads for images, videos, and audio
 * Returns Cloudinary delivery URL for storage in Supabase DB
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha1(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-1', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Cloudinary credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { file, resource_type = 'auto', folder = 'race-x', public_id, transformation } = body;

    if (!file) {
      return new Response(JSON.stringify({ error: 'file (base64 or URL) is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Build signature params
    const sigParams: Record<string, string> = { timestamp, folder };
    if (public_id) sigParams.public_id = public_id;
    if (transformation) sigParams.transformation = transformation;

    // Sort and build string to sign
    const sortedParams = Object.keys(sigParams)
      .sort()
      .map((k) => `${k}=${sigParams[k]}`)
      .join('&');

    const signature = await sha1(`${sortedParams}${apiSecret}`);

    // Build multipart form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);
    if (public_id) formData.append('public_id', public_id);
    if (transformation) formData.append('transformation', transformation);

    // Validate resource_type
    const safeResourceType = ['image', 'video', 'raw', 'auto'].includes(resource_type)
      ? resource_type
      : 'auto';

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${safeResourceType}/upload`;

    const cloudinaryResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!cloudinaryResponse.ok) {
      const errText = await cloudinaryResponse.text();
      console.error('Cloudinary upload error:', errText);
      return new Response(JSON.stringify({ error: 'Cloudinary upload failed', details: errText }), {
        status: cloudinaryResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await cloudinaryResponse.json();

    return new Response(JSON.stringify({
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration,
      bytes: result.bytes,
      created_at: result.created_at,
      provider: 'cloudinary',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('cloudinary-upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
