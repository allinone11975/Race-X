import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, TrendingUp, TrendingDown, Users, Activity, Star,
  Download, BarChart3, PieChart, LineChart as LineChartIcon,
  Zap, Target, Eye, Film
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { RxBadge } from '@/components/common/RxBadge';
import {
  LineChart, Line, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface KpiData {
  metric_name: string;
  metric_value: number;
  date: string;
}

const NEON_COLORS = ['#00F2FF', '#BC13FE', '#22c55e', '#facc15', '#f87171', '#a78bfa'];

const KpiCard = ({ title, value, trend, icon, color }: {
  title: string; value: string | number; trend?: number; icon: React.ReactNode; color: string;
}) => (
  <Card className="glass-strong border-border relative">
    <RxBadge />
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs mt-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}% vs yesterday
            </div>
          )}
        </div>
        <div style={{ color, filter: `drop-shadow(0 0 8px ${color})` }}>{icon}</div>
      </div>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong border border-[#00F2FF]/30 p-3 rounded-lg text-xs">
        <p className="text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value?.toLocaleString()}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsDashboardPage() {
  const navigate = useNavigate();
  const [kpiData, setKpiData] = useState<KpiData[]>([]);
  const [dateRange, setDateRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('kpis');
  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  const fetchKpis = useCallback(async () => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const { data } = await supabase
      .from('rx_analytics_kpis')
      .select('*')
      .gte('date', fromDate.toISOString().split('T')[0])
      .order('date');
    if (data) setKpiData(data);
  }, [dateRange]);

  useEffect(() => {
    if (!user.is_admin) { navigate('/gateway'); return; }
    fetchKpis();
  }, [user.is_admin, navigate, fetchKpis]);

  // Process data for charts
  const getMetricByDate = (metric: string) =>
    kpiData.filter(d => d.metric_name === metric).map(d => ({
      date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      value: d.metric_value,
    }));

  const latestMetric = (metric: string) => {
    const vals = kpiData.filter(d => d.metric_name === metric);
    return vals.length > 0 ? vals[vals.length - 1].metric_value : 0;
  };

  const metricTrend = (metric: string) => {
    const vals = kpiData.filter(d => d.metric_name === metric);
    if (vals.length < 2) return 0;
    const prev = vals[vals.length - 2].metric_value;
    const curr = vals[vals.length - 1].metric_value;
    if (prev === 0) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Combined diamond chart data
  const diamondChartData = (() => {
    const earned = kpiData.filter(d => d.metric_name === 'diamonds_earned');
    const spent = kpiData.filter(d => d.metric_name === 'diamonds_spent');
    return earned.map((e, i) => ({
      date: new Date(e.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      Earned: e.metric_value,
      Spent: spent[i]?.metric_value || 0,
    }));
  })();

  const renderChartData = getMetricByDate('total_renders');
  const adImpressions = getMetricByDate('ad_impressions');
  const adCompletions = getMetricByDate('ad_completions');
  const adCombined = adImpressions.map((d, i) => ({
    date: d.date,
    Impressions: d.value,
    Completions: adCompletions[i]?.value || 0,
  }));

  // Provider performance (static demo data)
  const providerCostData = [
    { provider: 'HuggingFace', cost: 1840 },
    { provider: 'Groq', cost: 620 },
    { provider: 'HF-MusicGen', cost: 540 },
    { provider: 'HF-CogVideo', cost: 2200 },
    { provider: 'HF-Bark', cost: 780 },
    { provider: 'Cloudinary', cost: 430 },
  ];

  const priorityPieData = [
    { name: 'High', value: 35 },
    { name: 'Medium', value: 45 },
    { name: 'Low', value: 20 },
  ];

  const exportCSV = () => {
    const csv = ['Metric,Value,Date', ...kpiData.map(d => `${d.metric_name},${d.metric_value},${d.date}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rx_analytics_${dateRange}.csv`;
    a.click();
    toast.success('Analytics data exported');
  };

  const tabs = [
    { key: 'kpis', label: 'Platform KPIs', icon: <Activity className="w-3 h-3" /> },
    { key: 'diamonds', label: 'Diamond Economy', icon: <Zap className="w-3 h-3" /> },
    { key: 'providers', label: 'Provider Perf', icon: <BarChart3 className="w-3 h-3" /> },
    { key: 'creators', label: 'Creator Analytics', icon: <Star className="w-3 h-3" /> },
    { key: 'renders', label: 'Render Stats', icon: <Film className="w-3 h-3" /> },
    { key: 'ads', label: 'Ad Revenue', icon: <Target className="w-3 h-3" /> },
    { key: 'viral', label: 'Viral Trends', icon: <TrendingUp className="w-3 h-3" /> },
  ];

  return (
    <div className="min-h-screen carbon-fiber flex flex-col">
      {/* Header */}
      <div className="glass-strong border-b border-[#00F2FF]/20 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-[#00F2FF] hover:bg-[#00F2FF]/10">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold" style={{ background: 'linear-gradient(90deg, #00F2FF, #BC13FE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Analytics & BI Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">Platform Intelligence — Phase 3</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-28 h-8 text-xs bg-black/30 border-[#00F2FF]/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={exportCSV}
            className="h-8 text-xs gap-1 border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/10">
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="glass-strong border-b border-border px-4 py-2 flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 max-w-7xl mx-auto">

          {/* PLATFORM KPIs */}
          {activeTab === 'kpis' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <KpiCard title="Daily Active Users" value={latestMetric('dau').toLocaleString()} trend={metricTrend('dau')} color="#00F2FF" icon={<Users className="w-6 h-6" />} />
                <KpiCard title="Monthly Active Users" value={latestMetric('mau').toLocaleString()} trend={metricTrend('mau')} color="#BC13FE" icon={<Users className="w-6 h-6" />} />
                <KpiCard title="Total Renders" value={latestMetric('total_renders').toLocaleString()} trend={metricTrend('total_renders')} color="#22c55e" icon={<Film className="w-6 h-6" />} />
                <KpiCard title="Diamonds Earned" value={latestMetric('diamonds_earned').toLocaleString()} trend={metricTrend('diamonds_earned')} color="#facc15" icon={<Zap className="w-6 h-6" />} />
                <KpiCard title="Ad Impressions" value={latestMetric('ad_impressions').toLocaleString()} trend={metricTrend('ad_impressions')} color="#a78bfa" icon={<Eye className="w-6 h-6" />} />
              </div>
              <Card className="glass-strong border-[#00F2FF]/20 relative">
                <RxBadge />
                <CardHeader><CardTitle className="text-sm text-[#00F2FF]">Daily Active Users Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={getMetricByDate('dau')}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="value" name="DAU" stroke="#00F2FF" strokeWidth={2} dot={{ fill: '#00F2FF', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* DIAMOND ECONOMY */}
          {activeTab === 'diamonds' && (
            <div className="space-y-6">
              <Card className="glass-strong border-yellow-400/20 relative">
                <RxBadge />
                <CardHeader><CardTitle className="text-sm text-yellow-400">Diamonds Earned vs Spent Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={diamondChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="Earned" stroke="#facc15" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Spent" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="glass-strong border-border relative">
                  <RxBadge />
                  <CardHeader className="pb-3 border-b border-border"><CardTitle className="text-sm text-[#00F2FF]">Top Earners Leaderboard</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border text-muted-foreground">
                        <th className="text-left px-4 py-2">Rank</th><th className="text-left px-4 py-2">User</th><th className="text-right px-4 py-2">Earned</th><th className="text-right px-4 py-2">Spent</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {['Alpha Creator', 'CineMax Pro', 'VoiceKing', 'SocialStar', 'PixelMaster'].map((u, i) => (
                          <tr key={u} className="hover:bg-white/5">
                            <td className="px-4 py-2.5 text-yellow-400 font-bold">#{i + 1}</td>
                            <td className="px-4 py-2.5">{u}</td>
                            <td className="px-4 py-2.5 text-right text-green-400">{(800 - i * 120).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-red-400">{(400 - i * 55).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <Card className="glass-strong border-border relative">
                  <RxBadge />
                  <CardHeader><CardTitle className="text-sm text-[#BC13FE]">Balance Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <RPieChart>
                        <Pie data={[{ name: '0-100 💎', value: 45 }, { name: '101-500 💎', value: 30 }, { name: '501-1000 💎', value: 15 }, { name: '1000+ 💎', value: 10 }]}
                          cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                          {NEON_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </RPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* PROVIDER PERFORMANCE */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <Card className="glass-strong border-[#BC13FE]/20 relative">
                <RxBadge />
                <CardHeader><CardTitle className="text-sm text-[#BC13FE]">Cost Per Provider (Diamonds)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={providerCostData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="provider" tick={{ fontSize: 11, fill: '#888' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="cost" name="Cost (💎)" fill="#BC13FE" radius={[4, 4, 0, 0]}>
                        {providerCostData.map((_, i) => <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="glass-strong border-border relative">
                  <RxBadge />
                  <CardHeader><CardTitle className="text-sm text-green-400">Success Rate by Provider</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { provider: 'HF-SDXL', rate: 97 }, { provider: 'HF-Bark', rate: 99 },
                        { provider: 'Groq', rate: 99 }, { provider: 'HF-CogVideo', rate: 94 },
                        { provider: 'HF-MusicGen', rate: 96 }, { provider: 'Cloudinary', rate: 99 },
                      ]}>
                        <XAxis dataKey="provider" tick={{ fontSize: 10, fill: '#888' }} />
                        <YAxis domain={[90, 100]} tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="rate" name="Success %" fill="#22c55e" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="glass-strong border-border relative">
                  <RxBadge />
                  <CardHeader><CardTitle className="text-sm text-red-400">Error Rate Over Time</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={[
                        { day: 'Mon', err: 1.2 }, { day: 'Tue', err: 0.8 }, { day: 'Wed', err: 2.1 },
                        { day: 'Thu', err: 0.9 }, { day: 'Fri', err: 1.5 }, { day: 'Sat', err: 0.6 }, { day: 'Sun', err: 0.7 },
                      ]}>
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#888' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="err" name="Error %" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* CREATOR ANALYTICS */}
          {activeTab === 'creators' && (
            <div className="space-y-6">
              <Card className="glass-strong border-[#00F2FF]/20 relative">
                <RxBadge />
                <CardHeader className="border-b border-border pb-3"><CardTitle className="text-sm text-[#00F2FF]">Top Creators by Engagement</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-xs">
                    <thead><tr className="border-b border-border text-muted-foreground">
                      <th className="text-left px-4 py-3">Rank</th><th className="text-left px-4 py-3">Creator</th>
                      <th className="text-right px-4 py-3">Posts</th><th className="text-right px-4 py-3">Likes</th>
                      <th className="text-right px-4 py-3">Comments</th><th className="text-right px-4 py-3">Engagement</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {['CineMaestro', 'VoiceArtist', 'NeonVisual', 'AIDirector', 'SoundForge', 'PixelPulse', 'StoryWeaver', 'MelodyMaker'].map((c, i) => (
                        <tr key={c} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-[#00F2FF] font-bold">#{i + 1}</td>
                          <td className="px-4 py-3">{c}</td>
                          <td className="px-4 py-3 text-right">{(120 - i * 12).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-green-400">{(8400 - i * 850).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-[#00F2FF]">{(1200 - i * 120).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-[#BC13FE]">{(18 - i * 1.5).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card className="glass-strong border-border relative">
                <RxBadge />
                <CardHeader><CardTitle className="text-sm text-[#BC13FE]">Total Engagement Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={[
                      { day: 'Day 1', eng: 4200 }, { day: 'Day 2', eng: 5100 }, { day: 'Day 3', eng: 4800 },
                      { day: 'Day 4', eng: 6300 }, { day: 'Day 5', eng: 7200 }, { day: 'Day 6', eng: 8100 }, { day: 'Day 7', eng: 9400 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#888' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="eng" name="Engagements" stroke="#BC13FE" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* RENDER QUEUE STATS */}
          {activeTab === 'renders' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="glass-strong border-[#00F2FF]/20 relative">
                  <RxBadge />
                  <CardHeader><CardTitle className="text-sm text-[#00F2FF]">Render Jobs Per Day</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={renderChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="value" name="Jobs" stroke="#00F2FF" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="glass-strong border-[#BC13FE]/20 relative">
                  <RxBadge />
                  <CardHeader><CardTitle className="text-sm text-[#BC13FE]">Priority Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <RPieChart>
                        <Pie data={priorityPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}>
                          <Cell fill="#f87171" /><Cell fill="#00F2FF" /><Cell fill="#22c55e" />
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </RPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <Card className="glass-strong border-border relative">
                <RxBadge />
                <CardHeader><CardTitle className="text-sm text-yellow-400">Avg Wait Time (minutes)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={[
                      { day: 'Day 1', wait: 2.1 }, { day: 'Day 2', wait: 3.4 }, { day: 'Day 3', wait: 1.8 },
                      { day: 'Day 4', wait: 4.2 }, { day: 'Day 5', wait: 2.9 }, { day: 'Day 6', wait: 2.1 }, { day: 'Day 7', wait: 1.5 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#888' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="wait" name="Wait Time (min)" stroke="#facc15" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* AD REVENUE */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard title="Ad Impressions" value={latestMetric('ad_impressions').toLocaleString()} trend={metricTrend('ad_impressions')} color="#a78bfa" icon={<Eye className="w-6 h-6" />} />
                <KpiCard title="Ad Completions" value={latestMetric('ad_completions').toLocaleString()} trend={metricTrend('ad_completions')} color="#22c55e" icon={<Target className="w-6 h-6" />} />
                <KpiCard title="Diamonds Awarded" value={Math.round(latestMetric('ad_completions') * 1.5).toLocaleString()} color="#facc15" icon={<Zap className="w-6 h-6" />} />
                <KpiCard title="Completion Rate"
                  value={`${latestMetric('ad_impressions') > 0 ? Math.round((latestMetric('ad_completions') / latestMetric('ad_impressions')) * 100) : 0}%`}
                  color="#00F2FF" icon={<TrendingUp className="w-6 h-6" />} />
              </div>
              <Card className="glass-strong border-[#00F2FF]/20 relative">
                <RxBadge />
                <CardHeader><CardTitle className="text-sm text-[#00F2FF]">Impressions & Completions Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={adCombined}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="Impressions" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Completions" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* VIRAL TRENDS */}
          {activeTab === 'viral' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="glass-strong border-[#00F2FF]/20 relative">
                  <RxBadge />
                  <CardHeader className="border-b border-border pb-3"><CardTitle className="text-sm text-[#00F2FF]">Top Viral Content</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border text-muted-foreground">
                        <th className="text-left px-4 py-2">Content</th><th className="text-right px-4 py-2">Likes</th><th className="text-right px-4 py-2">Score</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {['Cinematic AI Reel', 'Voice Clone Demo', 'AI Music Mix', 'Face Swap Clip', 'Full Movie Gen'].map((c, i) => (
                          <tr key={c} className="hover:bg-white/5">
                            <td className="px-4 py-2.5 flex items-center gap-2"><span className="text-[#BC13FE]">#{i + 1}</span> {c}</td>
                            <td className="px-4 py-2.5 text-right text-green-400">{(24000 - i * 3800).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-[#00F2FF]">{(98 - i * 4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <Card className="glass-strong border-[#BC13FE]/20 relative">
                  <RxBadge />
                  <CardHeader className="border-b border-border pb-3"><CardTitle className="text-sm text-[#BC13FE]">Trending Hashtags</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border text-muted-foreground">
                        <th className="text-left px-4 py-2">Hashtag</th><th className="text-right px-4 py-2">Uses</th><th className="text-right px-4 py-2">Growth</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {['#AICreator', '#RaceX', '#CinemaAI', '#VoiceClone', '#NeonArt', '#AIMusic'].map((h, i) => (
                          <tr key={h} className="hover:bg-white/5">
                            <td className="px-4 py-2.5 text-[#BC13FE]">{h}</td>
                            <td className="px-4 py-2.5 text-right">{(8200 - i * 900).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-green-400">+{(45 - i * 6)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
              <Card className="glass-strong border-border relative">
                <RxBadge />
                <CardHeader><CardTitle className="text-sm text-yellow-400">Engagement Spikes</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={[
                      { day: 'Day 1', eng: 12000 }, { day: 'Day 2', eng: 15000 }, { day: 'Day 3', eng: 48000 },
                      { day: 'Day 4', eng: 22000 }, { day: 'Day 5', eng: 18000 }, { day: 'Day 6', eng: 61000 }, { day: 'Day 7', eng: 34000 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#888' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="eng" name="Total Engagements" stroke="#facc15" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
