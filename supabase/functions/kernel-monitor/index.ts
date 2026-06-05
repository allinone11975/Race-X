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
    const action = url.searchParams.get('action') || 'health';

    if (action === 'health') {
      // Get current health data
      const { data: healthData } = await supabaseClient
        .from('rx_kernel_health')
        .select('*')
        .order('subsystem_name');

      // Calculate overall score
      const overallScore = healthData && healthData.length > 0
        ? Math.round(healthData.reduce((s: number, d: { health_score: number }) => s + d.health_score, 0) / healthData.length)
        : 0;

      return new Response(JSON.stringify({ health: healthData, overallScore }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'events') {
      const eventType = url.searchParams.get('event_type');
      const severity = url.searchParams.get('severity');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      let query = supabaseClient
        .from('rx_system_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (eventType) query = query.eq('event_type', eventType);
      if (severity) query = query.eq('severity', severity);

      const { data } = await query;
      return new Response(JSON.stringify({ events: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'restart_module' && req.method === 'POST') {
      const { module_name } = await req.json();
      // Log the restart event
      await supabaseClient.from('rx_system_events').insert({
        event_type: 'MODULE_RESTART',
        subsystem: module_name,
        description: `Module "${module_name}" restarted by admin`,
        severity: 'warning',
      });
      return new Response(JSON.stringify({ success: true, message: `${module_name} restart initiated` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'flush_cache' && req.method === 'POST') {
      const { module_name } = await req.json();
      await supabaseClient.from('rx_system_events').insert({
        event_type: 'CACHE_FLUSH',
        subsystem: module_name,
        description: `Cache flushed for "${module_name}" by admin`,
        severity: 'info',
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'emergency_shutdown' && req.method === 'POST') {
      const { module_name } = await req.json();
      // Update health status for the module
      await supabaseClient
        .from('rx_kernel_health')
        .update({ status: 'offline', health_score: 0 })
        .eq('subsystem_name', module_name);

      await supabaseClient.from('rx_system_events').insert({
        event_type: 'EMERGENCY_SHUTDOWN',
        subsystem: module_name,
        description: `EMERGENCY SHUTDOWN triggered for "${module_name}" by admin`,
        severity: 'critical',
      });

      return new Response(JSON.stringify({ success: true, message: `${module_name} emergency shutdown executed` }), {
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
