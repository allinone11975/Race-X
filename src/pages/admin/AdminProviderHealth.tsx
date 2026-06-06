/**
 * Admin Provider Health Monitor
 * Live latency · uptime · failure rates · auto-routing status
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Activity, RefreshCw, Zap, CheckCircle2,
  XCircle, AlertTriangle, Wifi, WifiOff, Clock, TrendingUp,
  Play, ChevronRight, Cpu, Server
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface HealthSnapshot {
  provider_name: string;
  status: 'online' | 'degraded' | 'offline';
  latency_ms: number;
  success_rate: number;
  error_count: number;
  checked_at: string;
}

interface HealthSummary {
  online: number;
  degraded: number;
  offline: number;
  avg_latency_ms: number;
  total: number;
}

const STATUS_CONFIG = {
  online:   { color: '#00FF88', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Online',   bg: 'bg-[#00FF88]/10 border-[#00FF88]/20' },
  degraded: { color: '#FFD700', icon: <AlertTriangle className="w-4 h-4" />, label: 'Degraded', bg: 'bg-[#FFD700]/10 border-[#FFD700]/20' },
  offline:  { color: '#FF4444', icon: <XCircle className="w-4 h-4" />,      label: 'Offline',  bg: 'bg-red-500/10 border-red-400/20' },
};

const MODULE_LABEL: Record<string, string> = {
  groq_llama: 'Chat', groq_mixtral: 'Chat', gemini_flash: 'Chat',
  huggingface: 'Music/AI', stability: 'Images', elevenlabs: 'Voice',
  mubert: 'Music', openai: 'Images/Chat', cloudinary: 'Media', supabase_db: 'Database',
};

export default function AdminProviderHealth() {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState<HealthSnapshot[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadHistory();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(runHealthCheck, 60000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  const loadHistory = async () => {
    setLoading(true);
    // Get latest snapshot per provider
    const { data } = await supabase
      .from('provider_health_log')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      // Deduplicate: keep latest per provider
      const seen = new Set<string>();
      const latest = (data as HealthSnapshot[]).filter(r => {
        if (seen.has(r.provider_name)) return false;
        seen.add(r.provider_name);
        return true;
      });
      setSnapshots(latest);
      setLastChecked(data[0]?.checked_at ?? null);
    }
    setLoading(false);
  };

  const runHealthCheck = async () => {
    setRunning(true);
    toast.info('Running provider health check…');
    try {
      const { data, error } = await supabase.functions.invoke('provider-health-check', { method: 'GET' });
      if (error) throw error;
      const res = data as { results: HealthSnapshot[]; summary: HealthSummary; checked_at: string };
      setSnapshots(res.results ?? []);
      setSummary(res.summary ?? null);
      setLastChecked(res.checked_at);
      toast.success(`Health check complete — ${res.summary?.online ?? 0}/${res.summary?.total ?? 0} providers online`);
    } catch (e) {
      toast.error('Health check failed');
      console.error(e);
    }
    setRunning(false);
  };

  const latencyColor = (ms: number) =>
    ms === 0 ? '#FF4444' : ms < 500 ? '#00FF88' : ms < 2000 ? '#FFD700' : '#FF6B35';

  const onlineCount  = snapshots.filter(s => s.status === 'online').length;
  const degradedCount = snapshots.filter(s => s.status === 'degraded').length;
  const offlineCount = snapshots.filter(s => s.status === 'offline').length;
  const avgLatency   = snapshots.length > 0
    ? Math.round(snapshots.filter(s => s.latency_ms > 0).reduce((a, b) => a + b.latency_ms, 0) / snapshots.filter(s => s.latency_ms > 0).length)
    : 0;

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white pb-12">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <button onClick={() => navigate('/admin/omniverse')} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Activity className="w-4 h-4 text-[#00F2FF] shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black tracking-widest">PROVIDER HEALTH MONITOR</h1>
              <p className="text-[10px] text-white/40">Live latency · uptime · failure rates · auto-routing intelligence</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(p => !p)}
                className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-bold transition-all ${
                  autoRefresh ? 'border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88]' : 'border-white/10 text-white/40 hover:text-white/70'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-[#00FF88] animate-pulse' : 'bg-white/30'}`} />
                Auto
              </button>
              <Button size="sm" onClick={runHealthCheck} disabled={running}
                className="h-8 px-3 text-xs bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/20">
                {running ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                {running ? 'Checking…' : 'Run Check'}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Online',      value: loading ? '…' : onlineCount,   color: '#00FF88', icon: <CheckCircle2 className="w-4 h-4" /> },
              { label: 'Degraded',    value: loading ? '…' : degradedCount, color: '#FFD700', icon: <AlertTriangle className="w-4 h-4" /> },
              { label: 'Offline',     value: loading ? '…' : offlineCount,  color: '#FF4444', icon: <XCircle className="w-4 h-4" /> },
              { label: 'Avg Latency', value: loading ? '…' : `${avgLatency}ms`, color: '#00F2FF', icon: <Clock className="w-4 h-4" /> },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-white/[0.03] border-white/8 rounded-xl h-full">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ color: s.color }}>{s.icon}</span>
                    </div>
                    <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Last checked */}
          {lastChecked && (
            <p className="text-xs text-white/30">
              Last checked: {new Date(lastChecked).toLocaleString()} ·
              {autoRefresh ? <span className="text-[#00FF88] ml-1">Auto-refresh ON (60s)</span> : <span className="text-white/30 ml-1"> Auto-refresh OFF</span>}
            </p>
          )}

          {/* Provider cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : snapshots.length === 0 ? (
            <div className="py-16 text-center">
              <Server className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm mb-2">No health data yet</p>
              <p className="text-white/25 text-xs mb-4">Run a health check to see live provider status</p>
              <Button onClick={runHealthCheck} disabled={running}
                className="h-9 px-5 bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/20 text-xs font-bold">
                <Play className="w-3 h-3 mr-1" /> Run First Check
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {snapshots.map((s, i) => {
                const cfg = STATUS_CONFIG[s.status];
                return (
                  <motion.div key={s.provider_name} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                    <Card className={`rounded-xl border ${cfg.bg} transition-all hover:scale-[1.01]`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span style={{ color: cfg.color }}>{cfg.icon}</span>
                              <span className="text-sm font-bold text-white truncate">{s.provider_name}</span>
                            </div>
                            <Badge className="text-[9px] px-1.5 py-0 bg-white/5 border-white/10 text-white/40 mb-2">
                              {MODULE_LABEL[s.provider_name] ?? 'General'}
                            </Badge>
                            <div className="grid grid-cols-3 gap-2 text-center mt-2">
                              <div>
                                <p className="text-xs font-black" style={{ color: latencyColor(s.latency_ms) }}>
                                  {s.latency_ms > 0 ? `${s.latency_ms}ms` : '—'}
                                </p>
                                <p className="text-[9px] text-white/30">Latency</p>
                              </div>
                              <div>
                                <p className={`text-xs font-black ${s.success_rate >= 95 ? 'text-[#00FF88]' : s.success_rate >= 70 ? 'text-[#FFD700]' : 'text-red-400'}`}>
                                  {s.success_rate}%
                                </p>
                                <p className="text-[9px] text-white/30">Success</p>
                              </div>
                              <div>
                                <p className={`text-xs font-black ${s.error_count === 0 ? 'text-[#00FF88]' : 'text-red-400'}`}>
                                  {s.error_count}
                                </p>
                                <p className="text-[9px] text-white/30">Errors</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`text-[9px] px-2 py-0.5 border ${cfg.bg}`} style={{ color: cfg.color }}>
                              {cfg.label}
                            </Badge>
                          </div>
                        </div>
                        {/* Latency bar */}
                        <div className="h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((s.latency_ms / 5000) * 100, 100)}%` }}
                            transition={{ duration: 0.6, delay: i * 0.04 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: latencyColor(s.latency_ms) }}
                          />
                        </div>
                        <p className="text-[9px] text-white/25 mt-1">
                          {new Date(s.checked_at).toLocaleTimeString()}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Auto-routing status */}
          <Card className="bg-white/[0.03] border-white/8 rounded-2xl">
            <CardContent className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-[#BC13FE]" />
                <div>
                  <p className="text-xs font-bold text-white">Auto-Routing Intelligence</p>
                  <p className="text-[10px] text-white/40">
                    The Unified AI Gateway automatically routes traffic to the healthiest provider.
                    Providers with latency &gt;3000ms are marked degraded. Offline providers are bypassed and their fallback is used.
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
                  <span className="text-xs text-[#00FF88] font-bold">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
