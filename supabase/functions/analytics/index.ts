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
    const action = url.searchParams.get('action') || 'get_kpis';
    const dateRange = url.searchParams.get('date_range') || '7d';

    // Compute date filter
    const days = dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    if (action === 'get_kpis') {
      const { data } = await supabaseClient
        .from('rx_analytics_kpis')
        .select('*')
        .gte('date', fromDateStr)
        .order('date');

      return new Response(JSON.stringify({ kpis: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_diamond_stats') {
      const earned = await supabaseClient
        .from('rx_analytics_kpis')
        .select('*')
        .eq('metric_name', 'diamonds_earned')
        .gte('date', fromDateStr)
        .order('date');

      const spent = await supabaseClient
        .from('rx_analytics_kpis')
        .select('*')
        .eq('metric_name', 'diamonds_spent')
        .gte('date', fromDateStr)
        .order('date');

      return new Response(JSON.stringify({
        earned: earned.data,
        spent: spent.data,
        total_earned: earned.data?.reduce((s: number, d: { metric_value: number }) => s + Number(d.metric_value), 0) || 0,
        total_spent: spent.data?.reduce((s: number, d: { metric_value: number }) => s + Number(d.metric_value), 0) || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_provider_stats') {
      // Return mock provider stats (would be real data in production)
      return new Response(JSON.stringify({
        providers: [
          { name: 'HuggingFace', cost: 1840, requests: 428, avg_latency: 3200, success_rate: 97, error_rate: 3 },
          { name: 'ElevenLabs', cost: 920, requests: 312, avg_latency: 1800, success_rate: 99, error_rate: 1 },
          { name: 'OpenRouter', cost: 540, requests: 891, avg_latency: 800, success_rate: 98, error_rate: 2 },
          { name: 'Kling AI', cost: 2200, requests: 48, avg_latency: 45000, success_rate: 94, error_rate: 6 },
          { name: 'Fal.ai', cost: 780, requests: 201, avg_latency: 5400, success_rate: 96, error_rate: 4 },
          { name: 'Replicate', cost: 630, requests: 178, avg_latency: 8100, success_rate: 95, error_rate: 5 },
        ],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_render_stats') {
      const { data } = await supabaseClient
        .from('rx_analytics_kpis')
        .select('*')
        .eq('metric_name', 'total_renders')
        .gte('date', fromDateStr)
        .order('date');

      return new Response(JSON.stringify({ renders: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_ad_stats') {
      const impressions = await supabaseClient
        .from('rx_analytics_kpis')
        .select('*')
        .eq('metric_name', 'ad_impressions')
        .gte('date', fromDateStr)
        .order('date');

      const completions = await supabaseClient
        .from('rx_analytics_kpis')
        .select('*')
        .eq('metric_name', 'ad_completions')
        .gte('date', fromDateStr)
        .order('date');

      const totalImpressions = impressions.data?.reduce((s: number, d: { metric_value: number }) => s + Number(d.metric_value), 0) || 0;
      const totalCompletions = completions.data?.reduce((s: number, d: { metric_value: number }) => s + Number(d.metric_value), 0) || 0;

      return new Response(JSON.stringify({
        impressions: impressions.data,
        completions: completions.data,
        total_impressions: totalImpressions,
        total_completions: totalCompletions,
        completion_rate: totalImpressions > 0 ? Math.round((totalCompletions / totalImpressions) * 100) : 0,
        diamonds_awarded: Math.round(totalCompletions * 1.5),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_viral_trends') {
      return new Response(JSON.stringify({
        top_content: [
          { id: 'reel_001', type: 'reel', likes: 24000, comments: 1800, shares: 3200, score: 98 },
          { id: 'post_042', type: 'post', likes: 18500, comments: 920, shares: 1400, score: 94 },
          { id: 'video_007', type: 'video', likes: 15200, comments: 780, shares: 2100, score: 91 },
        ],
        trending_hashtags: [
          { tag: '#AICreator', uses: 8200, growth: 45 },
          { tag: '#RaceX', uses: 7100, growth: 38 },
          { tag: '#CinemaAI', uses: 6300, growth: 29 },
          { tag: '#VoiceClone', uses: 5400, growth: 22 },
        ],
      }), {
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
