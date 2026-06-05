import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get_flags';

    if (action === 'get_flags') {
      const category = url.searchParams.get('category');
      const status = url.searchParams.get('status');

      let query = supabaseClient
        .from('rx_feature_flags')
        .select('*')
        .order('category', { ascending: true });

      if (category) query = query.eq('category', category);
      if (status === 'on') query = query.eq('status', true);
      if (status === 'off') query = query.eq('status', false);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ flags: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'toggle_flag' && req.method === 'POST') {
      const { flag_id, status, admin_user_id } = await req.json();

      // Get old value first
      const { data: oldFlag } = await supabaseClient
        .from('rx_feature_flags')
        .select('status')
        .eq('id', flag_id)
        .maybeSingle();

      const { error } = await supabaseClient
        .from('rx_feature_flags')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', flag_id);

      if (error) throw error;

      // Log history
      await supabaseClient.from('rx_flag_history').insert({
        flag_id,
        admin_user_id: admin_user_id || null,
        action: status ? 'enabled' : 'disabled',
        old_value: { status: oldFlag?.status },
        new_value: { status },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_rollout' && req.method === 'POST') {
      const { flag_id, rollout_scope, rollout_config, admin_user_id } = await req.json();

      const { error } = await supabaseClient
        .from('rx_feature_flags')
        .update({ rollout_scope, rollout_config: rollout_config || {}, updated_at: new Date().toISOString() })
        .eq('id', flag_id);

      if (error) throw error;

      await supabaseClient.from('rx_flag_history').insert({
        flag_id,
        admin_user_id: admin_user_id || null,
        action: 'rollout_changed',
        old_value: {},
        new_value: { rollout_scope, rollout_config },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'enable_beta' && req.method === 'POST') {
      const { flag_id, beta_percentage, beta_enabled, admin_user_id } = await req.json();

      const { error } = await supabaseClient
        .from('rx_feature_flags')
        .update({ beta_enabled, beta_percentage, updated_at: new Date().toISOString() })
        .eq('id', flag_id);

      if (error) throw error;

      await supabaseClient.from('rx_flag_history').insert({
        flag_id,
        admin_user_id: admin_user_id || null,
        action: 'beta_updated',
        old_value: {},
        new_value: { beta_enabled, beta_percentage },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_history') {
      const flag_id = url.searchParams.get('flag_id');
      if (!flag_id) {
        return new Response(JSON.stringify({ error: 'flag_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data } = await supabaseClient
        .from('rx_flag_history')
        .select('*')
        .eq('flag_id', flag_id)
        .order('changed_at', { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({ history: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
