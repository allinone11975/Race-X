/**
 * Fraud & Abuse Protection Panel
 * Bot detection flags, spam events, rate-limit violations, suspicious patterns
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, Search, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, ChevronLeft, ChevronRight, Eye, Ban, UserCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface FraudEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  ip_address: string | null;
  auto_action: string | null;
  resolved: boolean;
  created_at: string;
}

const SEV_STYLE = {
  low:      'bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/20',
  medium:   'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
  high:     'bg-[#FF6B35]/10 text-[#FF6B35] border-[#FF6B35]/20',
  critical: 'bg-red-500/10 text-red-400 border-red-400/20',
};

const PAGE_SIZE = 25;

export default function AdminFraud() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<FraudEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterSev, setFilterSev] = useState<'all' | FraudEvent['severity']>('all');
  const [filterResolved, setFilterResolved] = useState<'all' | 'open' | 'resolved'>('open');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('fraud_events').select('*', { count: 'exact' });
    if (filterSev !== 'all') q = q.eq('severity', filterSev);
    if (filterResolved === 'open') q = q.eq('resolved', false);
    if (filterResolved === 'resolved') q = q.eq('resolved', true);
    if (search) q = q.or(`event_type.ilike.%${search}%,ip_address.ilike.%${search}%`);
    const { data, count } = await q
      .order('resolved', { ascending: true })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setEvents((data as FraudEvent[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, search, filterSev, filterResolved]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string) => {
    await supabase.from('fraud_events').update({ resolved: true }).eq('id', id);
    await supabase.from('admin_audit_log').insert({ action_type: 'FRAUD_RESOLVE', target_type: 'fraud_event', target_id: id, severity: 'info' });
    setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
    toast.success('Event marked resolved');
  };

  const banUser = async (userId: string | null) => {
    if (!userId) return;
    await supabase.from('users').update({ is_banned: true } as never).eq('id', userId);
    await supabase.from('admin_audit_log').insert({ action_type: 'USER_BAN', target_type: 'user', target_id: userId, severity: 'critical', payload: { reason: 'Fraud detection' } });
    toast.error(`User ${userId.slice(0, 8)}… banned`);
  };

  const openCount  = events.filter(e => !e.resolved).length;
  const critCount  = events.filter(e => e.severity === 'critical').length;
  const highCount  = events.filter(e => e.severity === 'high').length;

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white">
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-red-500/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <button onClick={() => navigate('/admin/omniverse')} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Shield className="w-4 h-4 text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black tracking-widest">FRAUD & ABUSE PROTECTION</h1>
              <p className="text-[10px] text-white/40">Bot detection · spam flags · rate violations · suspicious patterns</p>
            </div>
            <button onClick={load} className="p-2 h-8 w-8 rounded-lg border border-white/10 hover:bg-white/5 flex items-center justify-center">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Open Events',    value: total, color: '#FF4444' },
              { label: 'Critical',       value: critCount, color: '#FF4444' },
              { label: 'High Severity',  value: highCount, color: '#FF6B35' },
            ].map(s => (
              <Card key={s.label} className="bg-white/[0.03] border-white/8 rounded-xl">
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-black" style={{ color: s.color }}>{loading ? '…' : s.value}</p>
                  <p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search event type, IP…" className="pl-9 h-9 text-xs bg-white/5 border-white/10" />
            </div>
            {(['all','low','medium','high','critical'] as const).map(s => (
              <button key={s} onClick={() => { setFilterSev(s); setPage(0); }}
                className={`px-3 h-9 rounded-lg text-xs font-bold border transition-all capitalize ${
                  filterSev === s ? SEV_STYLE[s === 'all' ? 'low' : s] : 'border-white/10 text-white/40 hover:text-white/70'
                }`}>{s}</button>
            ))}
            {(['all','open','resolved'] as const).map(s => (
              <button key={s} onClick={() => { setFilterResolved(s); setPage(0); }}
                className={`px-3 h-9 rounded-lg text-xs font-bold border transition-all capitalize ${
                  filterResolved === s ? 'border-[#00F2FF]/30 bg-[#00F2FF]/10 text-[#00F2FF]' : 'border-white/10 text-white/40 hover:text-white/70'
                }`}>{s}</button>
            ))}
          </div>

          {/* Event list */}
          <Card className="bg-white/[0.02] border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-white/40">
                    <th className="px-4 py-2 text-left whitespace-nowrap">Time</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">Event Type</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">Severity</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">User</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">IP</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">Auto Action</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">Status</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: '60%' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : events.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-16 text-center">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-[#00FF88] opacity-50" />
                      <p className="text-white/40 text-sm">No fraud events detected — Platform is clean</p>
                    </td></tr>
                  ) : events.map(ev => (
                    <motion.tr key={ev.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${ev.resolved ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-white/50">
                        {new Date(ev.created_at).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-bold text-white">{ev.event_type}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Badge className={`text-[9px] px-1.5 py-0 border ${SEV_STYLE[ev.severity]}`}>{ev.severity}</Badge>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-white/60">
                        {ev.user_id ? ev.user_id.slice(0, 8) + '…' : 'anon'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-white/40">{ev.ip_address ?? '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#FFD700]">{ev.auto_action ?? '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {ev.resolved
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF88]" />
                          : <AlertTriangle className="w-3.5 h-3.5 text-[#FFD700]" />}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {!ev.resolved && (
                            <button onClick={() => resolve(ev.id)}
                              className="p-1.5 rounded border border-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/10">
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                          )}
                          {ev.user_id && !ev.resolved && (
                            <button onClick={() => banUser(ev.user_id)}
                              className="p-1.5 rounded border border-red-500/20 text-red-400 hover:bg-red-500/10">
                              <Ban className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 px-3 text-xs border border-white/10">
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)} className="h-8 px-3 text-xs border border-white/10">
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminAuthGuard>
  );
}
