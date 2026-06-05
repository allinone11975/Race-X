/**
 * Admin Audit Log Viewer
 * Every admin action — provider changes, bans, key changes, config updates
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Activity, Search, Filter, Download,
  AlertTriangle, Info, Shield, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { supabase } from '@/db/supabase';

interface AuditEntry {
  id: string;
  admin_name: string | null;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

const PAGE_SIZE = 30;

const SEVERITY_STYLE = {
  info:     'bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/20',
  warning:  'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
  critical: 'bg-red-500/10 text-red-400 border-red-400/20',
};

const ACTION_COLOR: Record<string, string> = {
  KILL_SWITCH_ON:   '#FF4444',
  KILL_SWITCH_OFF:  '#00FF88',
  FEATURE_TOGGLE:   '#BC13FE',
  API_KEY_UPDATE:   '#FFD700',
  USER_BAN:         '#FF6B35',
  USER_UNBAN:       '#00FF88',
  PROVIDER_CHANGE:  '#00F2FF',
  BUDGET_UPDATE:    '#FFD700',
  PRICING_CHANGE:   '#BC13FE',
  NOTIFICATION_SENT:'#00FF88',
};

export default function AdminAuditLog() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('admin_audit_log').select('*', { count: 'exact' });
    if (severity !== 'all') q = q.eq('severity', severity);
    if (search) q = q.or(`action_type.ilike.%${search}%,target_type.ilike.%${search}%,admin_name.ilike.%${search}%`);
    const { data, count } = await q
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setLogs((data as AuditEntry[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, search, severity]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const rows = [
      ['Time', 'Admin', 'Action', 'Target Type', 'Target ID', 'Severity'],
      ...logs.map(l => [
        new Date(l.created_at).toISOString(),
        l.admin_name ?? 'system',
        l.action_type,
        l.target_type ?? '',
        l.target_id ?? '',
        l.severity,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit_log.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00FF88]/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <button onClick={() => navigate('/admin/omniverse')} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Activity className="w-4 h-4 text-[#00FF88] shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black tracking-widest">ADMIN AUDIT LOG</h1>
              <p className="text-[10px] text-white/40">All admin actions · provider changes · key updates · user bans</p>
            </div>
            <Button size="sm" onClick={exportCSV} className="h-8 px-3 text-xs bg-[#00FF88]/10 border border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/20">
              <Download className="w-3 h-3 mr-1" /> CSV
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search actions, targets, admins…"
                className="pl-9 h-9 text-xs bg-white/5 border-white/10"
              />
            </div>
            {(['all','info','warning','critical'] as const).map(s => (
              <button key={s} onClick={() => { setSeverity(s); setPage(0); }}
                className={`px-3 h-9 rounded-lg text-xs font-bold border transition-all capitalize ${
                  severity === s ? SEVERITY_STYLE[s === 'all' ? 'info' : s] + ' border-opacity-100' : 'border-white/10 text-white/40 hover:text-white/70'
                }`}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <button onClick={load} className="p-2 h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5 flex items-center justify-center">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex gap-4 text-xs text-white/50">
            <span>{total} total entries</span>
            <span>·</span>
            <span>Page {page + 1} of {Math.ceil(total / PAGE_SIZE) || 1}</span>
          </div>

          {/* Log entries */}
          <Card className="bg-white/[0.02] border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-white/40">
                    <th className="px-4 py-2 text-left whitespace-nowrap">Time</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">Admin</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">Action</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">Target</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">Severity</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center text-white/30">No audit entries found</td></tr>
                  ) : logs.map(log => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                        log.severity === 'critical' ? 'bg-red-500/[0.03]' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap text-white/50">
                        {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium text-white">
                        {log.admin_name ?? 'system'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-bold" style={{ color: ACTION_COLOR[log.action_type] ?? '#fff' }}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-white/60">
                        {log.target_type ? `${log.target_type}: ${log.target_id ?? '—'}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Badge className={`text-[9px] px-1.5 py-0 border ${SEVERITY_STYLE[log.severity]}`}>
                          {log.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 max-w-[200px] truncate text-white/40">
                        {Object.keys(log.payload ?? {}).length > 0
                          ? JSON.stringify(log.payload).slice(0, 60) + (JSON.stringify(log.payload).length > 60 ? '…' : '')
                          : '—'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="h-8 px-3 text-xs border border-white/10">
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}
                  className="h-8 px-3 text-xs border border-white/10">
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
