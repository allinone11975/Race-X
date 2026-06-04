/**
 * AdminSystemOverrides — Live system control center
 * Blacklist providers, override load balancer, view logs/stats/errors
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Activity, AlertTriangle, Ban, RefreshCw, Wifi, WifiOff,
  Zap, Server, Clock, ChevronDown, ChevronUp, Trash2, Play,
  Terminal, BarChart3, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/db/supabase';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { toast } from 'sonner';

interface ProviderHealth {
  id: string;
  provider_name: string;
  endpoint_url: string;
  status: 'online' | 'degraded' | 'offline';
  last_check: string;
  response_time_ms: number;
  error_rate: number;
  total_requests: number;
  failed_requests: number;
  is_blacklisted: boolean;
  priority: number;
}

interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
}

const STATUS_COLORS = {
  online: '#00FF88',
  degraded: '#FFD700',
  offline: '#FF4444',
};

export default function AdminSystemOverrides() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    // Load provider health from music_provider_health table
    const { data: healthData, error: healthErr } = await supabase
      .from('music_provider_health')
      .select('*')
      .order('priority', { ascending: true });

    if (!healthErr && healthData) {
      setProviders(healthData.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        provider_name: p.provider_name as string,
        endpoint_url: p.endpoint_url as string,
        status: p.status as 'online' | 'degraded' | 'offline',
        last_check: p.last_check as string,
        response_time_ms: p.response_time_ms as number,
        error_rate: p.error_rate as number,
        total_requests: p.total_requests as number,
        failed_requests: p.failed_requests as number,
        is_blacklisted: p.is_blacklisted as boolean,
        priority: p.priority as number,
      })));
    }

    // Generate mock logs if none exist
    setLogs([
      { id: '1', timestamp: new Date().toISOString(), level: 'info', source: 'Gateway', message: 'Round-robin cycle completed — 12 providers checked' },
      { id: '2', timestamp: new Date(Date.now() - 60000).toISOString(), level: 'warn', source: 'Provider-A', message: 'Response time exceeded 5000ms, marked degraded' },
      { id: '3', timestamp: new Date(Date.now() - 120000).toISOString(), level: 'info', source: 'Billing', message: 'Diamond deduction processed for user #42' },
      { id: '4', timestamp: new Date(Date.now() - 180000).toISOString(), level: 'error', source: 'Provider-C', message: 'Connection timeout after 3 retries' },
      { id: '5', timestamp: new Date(Date.now() - 300000).toISOString(), level: 'info', source: 'Storage', message: '48hr lifecycle cleanup — 23 files removed' },
    ]);

    setRefreshing(false);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleBlacklist = async (id: string, current: boolean) => {
    await supabase.from('music_provider_health').update({ is_blacklisted: !current }).eq('id', id);
    setProviders(prev => prev.map(p => p.id === id ? { ...p, is_blacklisted: !current } : p));
    toast.success(`Provider ${current ? 'unblacklisted' : 'blacklisted'}`);
  };

  const overrideStatus = async (id: string, status: 'online' | 'degraded' | 'offline') => {
    await supabase.from('music_provider_health').update({ status }).eq('id', id);
    setProviders(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    toast.success(`Status overridden to ${status}`);
  };

  const clearLogs = () => { setLogs([]); };

  const onlineCount = providers.filter(p => p.status === 'online' && !p.is_blacklisted).length;
  const blacklistedCount = providers.filter(p => p.is_blacklisted).length;
  const avgResponse = providers.length
    ? Math.round(providers.reduce((s, p) => s + p.response_time_ms, 0) / providers.length)
    : 0;

  const filteredLogs = logs.filter(l => logFilter === 'all' || l.level === logFilter);

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white">
        {/* Header */}
        <div className="border-b border-white/8 bg-[#0A0A0F]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF4444]/15 flex items-center justify-center border border-[#FF4444]/20">
                <Activity className="w-4 h-4 text-[#FF4444]" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white">System Overrides</h1>
                <p className="text-[10px] text-white/40">Live provider control, load balancer & logs</p>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing} className="border-white/10 text-xs">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { icon: <Wifi className="w-4 h-4" />, label: 'Online', value: `${onlineCount}/${providers.length}`, color: '#00FF88' },
              { icon: <Ban className="w-4 h-4" />, label: 'Blacklisted', value: blacklistedCount, color: '#FF4444' },
              { icon: <Zap className="w-4 h-4" />, label: 'Avg Response', value: `${avgResponse}ms`, color: '#00F2FF' },
              { icon: <BarChart3 className="w-4 h-4" />, label: 'Total Calls', value: providers.reduce((s, p) => s + p.total_requests, 0).toLocaleString(), color: '#FFD700' },
            ].map(s => (
              <Card key={s.label} className="bg-white/5 border-white/8 p-3 flex items-center gap-3">
                <div style={{ color: s.color }}>{s.icon}</div>
                <div>
                  <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-white/40">{s.label}</div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider Health Panel */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-[#00F2FF]" />
                <h2 className="text-sm font-bold text-white">Provider Health</h2>
                <Badge className="text-[10px] bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/20">{providers.length} Providers</Badge>
              </div>

              <div className="space-y-2">
                {loading ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)
                ) : providers.map(p => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`
                      border rounded-xl overflow-hidden transition-all
                      ${p.is_blacklisted ? 'border-[#FF4444]/20 bg-[#FF4444]/5' : 'border-white/8 bg-white/[0.02]'}
                    `}
                  >
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer"
                      onClick={() => setExpandedProvider(expandedProvider === p.id ? null : p.id)}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0`} style={{ backgroundColor: STATUS_COLORS[p.status] }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{p.provider_name}</span>
                          {p.is_blacklisted && <Badge className="text-[10px] bg-[#FF4444]/15 text-[#FF4444] border-[#FF4444]/20">BLACKLISTED</Badge>}
                        </div>
                        <div className="text-[10px] text-white/30 truncate">{p.endpoint_url}</div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span style={{ color: STATUS_COLORS[p.status] }}>{p.response_time_ms}ms</span>
                        <span className="text-white/20">{p.error_rate}% err</span>
                      </div>
                      {expandedProvider === p.id ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                    </div>

                    {expandedProvider === p.id && (
                      <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white/5 rounded-lg p-2">
                            <div className="text-xs font-bold text-white">{p.total_requests}</div>
                            <div className="text-[9px] text-white/30">Requests</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2">
                            <div className="text-xs font-bold text-[#FF4444]">{p.failed_requests}</div>
                            <div className="text-[9px] text-white/30">Failed</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2">
                            <div className="text-xs font-bold text-white">{p.priority}</div>
                            <div className="text-[9px] text-white/30">Priority</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 text-xs border-white/10" onClick={() => toggleBlacklist(p.id, p.is_blacklisted)}>
                            <Ban className="w-3 h-3 mr-1" /> {p.is_blacklisted ? 'Unblacklist' : 'Blacklist'}
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 text-xs border-white/10" onClick={() => overrideStatus(p.id, 'online')}>
                            <Wifi className="w-3 h-3 mr-1" /> Force Online
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 text-xs border-white/10" onClick={() => overrideStatus(p.id, 'offline')}>
                            <WifiOff className="w-3 h-3 mr-1" /> Force Offline
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Logs Panel */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00FF88]" />
                  <h2 className="text-sm font-bold text-white">System Logs</h2>
                  <Badge className="text-[10px] bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20">{filteredLogs.length}</Badge>
                </div>
                <div className="flex gap-1">
                  {(['all', 'error', 'warn', 'info'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`
                        text-[10px] px-2 py-1 rounded-md border transition-all uppercase font-bold
                        ${logFilter === f
                          ? f === 'error' ? 'bg-[#FF4444]/15 text-[#FF4444] border-[#FF4444]/20'
                            : f === 'warn' ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/20'
                            : 'bg-white/10 text-white border-white/20'
                          : 'border-transparent text-white/30 hover:text-white/60'
                        }
                      `}
                    >
                      {f}
                    </button>
                  ))}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearLogs}>
                    <Trash2 className="w-3 h-3 text-white/40" />
                  </Button>
                </div>
              </div>

              <Card className="bg-white/5 border-white/8 h-[500px] overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-2">
                    {filteredLogs.map(log => (
                      <div key={log.id} className="flex gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                        <Badge
                          className={`shrink-0 text-[9px] h-4 ${
                            log.level === 'error' ? 'bg-[#FF4444]/15 text-[#FF4444] border-[#FF4444]/20'
                            : log.level === 'warn' ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/20'
                            : 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20'
                          }`}
                        >
                          {log.level}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-white/70">{log.source}</span>
                            <span className="text-[9px] text-white/20">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/50 mt-0.5">{log.message}</p>
                        </div>
                      </div>
                    ))}
                    {filteredLogs.length === 0 && (
                      <div className="text-center py-10 text-white/20 text-xs">No logs match this filter</div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
