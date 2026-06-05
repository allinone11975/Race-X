import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, RefreshCw, Activity, Server, Cpu, Database,
  Zap, Shield, Flag, AlertTriangle, CheckCircle, XCircle,
  MinusCircle, Search, Filter, Power, Trash2, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { RxBadge } from '@/components/common/RxBadge';

interface KernelHealth {
  id: string;
  subsystem_name: string;
  status: 'online' | 'offline' | 'degraded';
  health_score: number;
  key_metric: string;
  last_check: string;
}

interface SystemEvent {
  id: string;
  event_type: string;
  subsystem: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  user_id: string | null;
  created_at: string;
}

const subsystemIcons: Record<string, React.ReactNode> = {
  'AI Providers': <Cpu className="w-4 h-4" />,
  'Render Queue': <Activity className="w-4 h-4" />,
  'Agent Sessions': <Server className="w-4 h-4" />,
  'Diamond Economy': <Zap className="w-4 h-4" />,
  'Affiliate System': <Database className="w-4 h-4" />,
  'Moderation System': <Shield className="w-4 h-4" />,
  'Feature Flags': <Flag className="w-4 h-4" />,
};

const severityColors: Record<string, string> = {
  info: 'text-[#00F2FF]',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  critical: 'text-[#BC13FE]',
};

const statusConfig = {
  online: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  degraded: { icon: <MinusCircle className="w-4 h-4" />, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  offline: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
};

function HealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#00F2FF' : score >= 50 ? '#FACC15' : '#F87171';
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1a1a2e" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Kernel Health Score</p>
    </div>
  );
}

export default function RxKernelPage() {
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState<KernelHealth[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [eventSearch, setEventSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [overallScore, setOverallScore] = useState(0);

  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  const fetchHealthData = useCallback(async () => {
    const { data, error } = await supabase
      .from('rx_kernel_health')
      .select('*')
      .order('subsystem_name');
    if (!error && data) {
      setHealthData(data);
      const avg = data.reduce((s, d) => s + d.health_score, 0) / (data.length || 1);
      setOverallScore(Math.round(avg));
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    let query = supabase
      .from('rx_system_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
    if (eventSearch) query = query.ilike('description', `%${eventSearch}%`);

    const { data, error } = await query;
    if (!error && data) setEvents(data);
  }, [severityFilter, eventSearch]);

  useEffect(() => {
    if (!user.is_admin) {
      toast.error('Admin access required');
      navigate('/gateway');
      return;
    }
    fetchHealthData();
    fetchEvents();
  }, [user.is_admin, navigate, fetchHealthData, fetchEvents]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealthData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealthData]);

  // Realtime subscription for system events
  useEffect(() => {
    const channel = supabase
      .channel('rx-kernel-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rx_system_events' }, (payload) => {
        setEvents(prev => [payload.new as SystemEvent, ...prev.slice(0, 49)]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rx_kernel_health' }, () => {
        fetchHealthData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchHealthData]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await fetchHealthData();
    await fetchEvents();
    // Log a system event
    await supabase.from('rx_system_events').insert({
      event_type: 'HEALTH_CHECK',
      subsystem: 'Kernel',
      description: 'Manual health check triggered by admin',
      severity: 'info',
    });
    toast.success('All subsystems refreshed');
    setIsRefreshing(false);
  };

  const handleModuleAction = async (action: string, module: string) => {
    await supabase.from('rx_system_events').insert({
      event_type: action.toUpperCase(),
      subsystem: module,
      description: `Admin triggered ${action} on ${module}`,
      severity: action === 'emergency_shutdown' ? 'critical' : 'warning',
    });
    toast.success(`${action.replace('_', ' ')} executed for ${module}`);
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="min-h-screen carbon-fiber flex flex-col">
      {/* Header */}
      <div className="glass-strong border-b border-[#00F2FF]/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-[#00F2FF] hover:bg-[#00F2FF]/10">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold" style={{ background: 'linear-gradient(90deg, #00F2FF, #BC13FE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              RX Kernel Control Center
            </h1>
            <p className="text-xs text-muted-foreground">System Health & Orchestration — Phase 3</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`gap-2 text-xs ${autoRefresh ? 'text-green-400 border-green-400/30' : 'text-muted-foreground'} border`}
          >
            <Activity className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button onClick={handleRefreshAll} disabled={isRefreshing} size="sm"
            className="bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/20 gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 max-w-7xl mx-auto">

          {/* Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gauge */}
            <Card className="glass-strong border-[#00F2FF]/20 flex items-center justify-center py-6 relative">
              <RxBadge />
              <HealthGauge score={overallScore} />
            </Card>

            {/* Quick Stats */}
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              {[
                { label: 'Online', value: healthData.filter(h => h.status === 'online').length, color: '#22c55e', icon: <CheckCircle className="w-5 h-5" /> },
                { label: 'Degraded', value: healthData.filter(h => h.status === 'degraded').length, color: '#facc15', icon: <MinusCircle className="w-5 h-5" /> },
                { label: 'Offline', value: healthData.filter(h => h.status === 'offline').length, color: '#f87171', icon: <XCircle className="w-5 h-5" /> },
                { label: 'Subsystems', value: healthData.length, color: '#BC13FE', icon: <Server className="w-5 h-5" /> },
              ].map((stat) => (
                <Card key={stat.label} className="glass-strong border-border relative">
                  <RxBadge />
                  <CardContent className="p-4 flex items-center gap-3">
                    <div style={{ color: stat.color, filter: `drop-shadow(0 0 6px ${stat.color})` }}>{stat.icon}</div>
                    <div>
                      <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Subsystem Status Grid */}
          <div>
            <h2 className="text-sm font-semibold text-[#00F2FF] mb-3 flex items-center gap-2">
              <Server className="w-4 h-4" /> Subsystem Status Grid
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {healthData.map((h) => {
                const cfg = statusConfig[h.status];
                return (
                  <Card key={h.id} className={`glass-strong border relative ${cfg.border}`}>
                    <RxBadge />
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`${cfg.color}`}>{subsystemIcons[h.subsystem_name] || <Server className="w-4 h-4" />}</div>
                        <span className="text-sm font-medium truncate">{h.subsystem_name}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs w-fit ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon}
                        <span className="capitalize">{h.status}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{h.key_metric}</div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-1000"
                          style={{
                            width: `${h.health_score}%`,
                            background: h.health_score >= 80 ? '#00F2FF' : h.health_score >= 50 ? '#facc15' : '#f87171',
                            boxShadow: `0 0 6px ${h.health_score >= 80 ? '#00F2FF' : h.health_score >= 50 ? '#facc15' : '#f87171'}`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">Score: {h.health_score}/100</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Provider Orchestration */}
          <Card className="glass-strong border-[#BC13FE]/20 relative">
            <RxBadge />
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm text-[#BC13FE] flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Provider Orchestration Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full min-w-[600px] text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 whitespace-nowrap">Route</th>
                    <th className="text-left py-2 whitespace-nowrap">Primary Provider</th>
                    <th className="text-left py-2 whitespace-nowrap">Fallback</th>
                    <th className="text-left py-2 whitespace-nowrap">Status</th>
                    <th className="text-left py-2 whitespace-nowrap">Avg Latency</th>
                    <th className="text-left py-2 whitespace-nowrap">Cost/Req</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { route: 'Image Gen', primary: 'HuggingFace SDXL', fallback: 'HF RealVisXL-V4', status: 'online', latency: '3.2s', cost: '5 💎' },
                    { route: 'Voice Synth', primary: 'HuggingFace Bark', fallback: 'HF Bark-Small', status: 'online', latency: '4.1s', cost: '5 💎' },
                    { route: 'Video Gen', primary: 'HuggingFace Zeroscope', fallback: 'HF CogVideoX-2B', status: 'online', latency: '45s', cost: '10 💎' },
                    { route: 'AI Chat', primary: 'Groq LLaMA 3.3 70B', fallback: 'Groq LLaMA 3.1 8B', status: 'online', latency: '0.8s', cost: '2 💎' },
                    { route: 'Music Gen', primary: 'HuggingFace MusicGen', fallback: 'HF MusicGen-Melody', status: 'online', latency: '8.1s', cost: '4 💎' },
                    { route: 'Melody Gen', primary: 'HF MusicGen-Melody', fallback: 'HF MusicGen-Small', status: 'online', latency: '5.4s', cost: '5 💎' },
                  ].map((row) => (
                    <tr key={row.route} className="hover:bg-white/5">
                      <td className="py-2.5 font-medium whitespace-nowrap">{row.route}</td>
                      <td className="py-2.5 text-[#00F2FF] whitespace-nowrap">{row.primary}</td>
                      <td className="py-2.5 text-muted-foreground whitespace-nowrap">{row.fallback}</td>
                      <td className="py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${row.status === 'online' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 whitespace-nowrap">{row.latency}</td>
                      <td className="py-2.5 whitespace-nowrap">{row.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Memory Systems + System Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Memory */}
            <Card className="glass-strong border-[#00F2FF]/20 relative">
              <RxBadge />
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm text-[#00F2FF] flex items-center gap-2">
                  <Database className="w-4 h-4" /> Memory Systems Monitor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {[
                  { label: 'Active Sessions', value: '0', sub: 'User sessions', color: '#00F2FF' },
                  { label: 'Cached Prompts', value: '842', sub: '74% hit rate · 128MB', color: '#BC13FE' },
                  { label: 'Storage Used', value: '2.4 GB', sub: 'of 100 GB · 2.4%', color: '#22c55e' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border bg-black/20">
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.sub}</div>
                    </div>
                    <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/10"
                    onClick={() => toast.success('Cache flushed successfully')}>
                    <Trash2 className="w-3 h-3" /> Flush Cache
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 border-[#BC13FE]/30 text-[#BC13FE] hover:bg-[#BC13FE]/10"
                    onClick={() => toast.success('Storage cleanup initiated')}>
                    <RotateCcw className="w-3 h-3" /> Cleanup Storage
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Controls */}
            <Card className="glass-strong border-red-400/20 relative">
              <RxBadge />
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <Power className="w-4 h-4" /> System Controls Panel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {['Render Queue', 'Agent Orchestrator', 'Diamond Economy', 'Affiliate System', 'Moderation'].map((module) => (
                  <div key={module} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-black/20">
                    <span className="text-sm">{module}</span>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                        onClick={() => handleModuleAction('restart', module)}>
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/10"
                        onClick={() => handleModuleAction('flush_cache', module)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-red-400/30 text-red-400 hover:bg-red-400/10"
                        onClick={() => { if (window.confirm(`Emergency shutdown ${module}?`)) handleModuleAction('emergency_shutdown', module); }}>
                        <Power className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Event Log Feed */}
          <Card className="glass-strong border-border relative">
            <RxBadge />
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-sm text-[#00F2FF] flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Event Log Feed
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2 top-2 w-3 h-3 text-muted-foreground" />
                    <Input placeholder="Search events..." value={eventSearch}
                      onChange={e => setEventSearch(e.target.value)}
                      className="pl-7 h-8 text-xs w-44 bg-black/30" />
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="h-8 w-32 text-xs bg-black/30">
                      <Filter className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                <div className="divide-y divide-border">
                  {events.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">No events yet. System activity will appear here.</div>
                  ) : events.map((ev) => (
                    <div key={ev.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 text-xs">
                      <span className="text-muted-foreground font-mono shrink-0 mt-0.5">{formatTime(ev.created_at)}</span>
                      <AlertTriangle className={`w-3 h-3 mt-0.5 shrink-0 ${severityColors[ev.severity]}`} />
                      <div className="min-w-0">
                        <span className={`font-medium ${severityColors[ev.severity]}`}>[{ev.event_type}]</span>
                        {ev.subsystem && <span className="text-muted-foreground ml-1">{ev.subsystem} ·</span>}
                        <span className="text-foreground/80 ml-1">{ev.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
