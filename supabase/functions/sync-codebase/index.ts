import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CodeFile {
  file_path: string;
  content: string;
  language: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData?.is_admin) {
      throw new Error('Admin access required');
    }

    // Parse request body to get files
    const { files } = await req.json() as { files: CodeFile[] };

    if (!files || !Array.isArray(files)) {
      throw new Error('Invalid files data');
    }

    // Batch upsert all files
    const { error: upsertError } = await supabaseClient
      .from('frontend_code_files')
      .upsert(
        files.map(f => ({
          file_path: f.file_path,
          content: f.content,
          language: f.language,
          last_updated_by: user.id,
        })),
        { onConflict: 'file_path' }
      );

    if (upsertError) {
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${files.length} files successfully` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
