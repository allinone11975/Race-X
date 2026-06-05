/**
 * ADMIN TRANSACTION LEDGER — Full ledger with filters, date range, CSV export
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Download, Search, Filter, TrendingUp, TrendingDown, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';

interface TxRow {
  id: string;
  user_id: string;
  action_type: string;
  diamond_balance_before: number | null;
  diamond_balance_after: number | null;
  transaction_category: string | null;
  api_key_handshake_status: string | null;
  safety_scan_result: string | null;
  created_at: string;
  username?: string;
}

const CATEGORY_BADGE: Record<string, string> = {
  spent:    'bg-red-400/15 text-red-300 border-red-400/25',
  earned:   'bg-green-400/15 text-green-300 border-green-400/25',
  gifted:   'bg-purple-400/15 text-purple-300 border-purple-400/25',
  received: 'bg-blue-400/15 text-blue-300 border-blue-400/25',
  referral: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/25',
};

export default function AdminTransactionLedger() {
  const navigate = useNavigate();
  const [txns, setTxns] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [category, setCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 30;

  // Stats
  const [stats, setStats] = useState({ total: 0, spent: 0, earned: 0, today: 0 });

  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  useEffect(() => {
    if (!user.is_admin) { navigate('/gateway'); return; }
    loadStats();
    fetchTxns(0);
  }, []);

  useEffect(() => { fetchTxns(page); }, [page, category, dateFrom, dateTo]);

  const loadStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [total, todayRes] = await Promise.all([
      supabase.from('transaction_ledger').select('transaction_category, diamond_balance_before, diamond_balance_after'),
      supabase.from('transaction_ledger').select('id', { count: 'exact', head: true }).gte('created_at', today),
    ]);
    const rows = Array.isArray(total.data) ? total.data : [];
    const spent = rows.filter((r: Record<string, unknown>) => r.transaction_category === 'spent').length;
    const earned = rows.filter((r: Record<string, unknown>) => r.transaction_category === 'earned').length;
    setStats({ total: rows.length, spent, earned, today: todayRes.count ?? 0 });
  };

  const fetchTxns = useCallback(async (pg: number) => {
    setLoading(true);
    let q = supabase
      .from('transaction_ledger')
      .select('*, users!transaction_ledger_user_id_fkey(username)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE - 1);

    if (category !== 'all') q = q.eq('transaction_category', category);
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59');

    const { data, count } = await q;
    setTotalCount(count ?? 0);
    setTxns(Array.isArray(data) ? data.map((r: Record<string, unknown>) => ({
      ...r,
      username: (r.users as { username?: string } | null)?.username,
    })) as TxRow[] : []);
    setLoading(false);
  }, [category, dateFrom, dateTo]);

  // CSV export
  const exportCSV = () => {
    const header = ['ID', 'User', 'Action', 'Category', 'Before', 'After', 'Delta', 'Date'];
    const rows = txns.map(t => [
      t.id.slice(0, 8),
      t.username ?? t.user_id.slice(0, 8),
      t.action_type,
      t.transaction_category ?? '',
      t.diamond_balance_before ?? '',
      t.diamond_balance_after ?? '',
      ((t.diamond_balance_after ?? 0) - (t.diamond_balance_before ?? 0)),
      new Date(t.created_at).toLocaleString(),
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ledger_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = searchQ
    ? txns.filter(t => (t.username ?? '').toLowerCase().includes(searchQ.toLowerCase()) || t.action_type.toLowerCase().includes(searchQ.toLowerCase()))
    : txns;

  return (
    <AdminAuthGuard>
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 rounded-lg border border-white/10 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <RxBadge label="LEDGER" variant="green" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold tracking-widest">TRANSACTION LEDGER</h1>
            <p className="text-[10px] text-muted-foreground">{totalCount.toLocaleString()} total transactions</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={exportCSV} className="border border-white/10 text-xs">
              <Download className="w-3 h-3 mr-1" />CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={() => fetchTxns(page)} className="border border-white/10 text-xs">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 p-4 pb-0">
        {[
          { label: 'Total Txns', value: stats.total, icon: Filter, color: 'text-white' },
          { label: 'Spent',      value: stats.spent,  icon: TrendingDown, color: 'text-red-400' },
          { label: 'Earned',     value: stats.earned, icon: TrendingUp,   color: 'text-[#00FF88]' },
          { label: 'Today',      value: stats.today,  icon: Diamond,      color: 'text-[#00F2FF]' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 rounded-xl p-2.5 text-center">
            <p className={`text-base font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="p-4 pb-0 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search user or action…"
              className="pl-8 h-8 bg-white/5 border-white/10 text-white text-xs" />
          </div>
          <Select value={category} onValueChange={v => { setCategory(v); setPage(0); }}>
            <SelectTrigger className="w-28 h-8 bg-white/5 border-white/10 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1C1C27] border-white/10">
              {['all', 'spent', 'earned', 'gifted', 'received', 'referral'].map(c => (
                <SelectItem key={c} value={c} className="text-xs text-white capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }}
            className="flex-1 h-8 bg-white/5 border-white/10 text-white text-xs" />
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }}
            className="flex-1 h-8 bg-white/5 border-white/10 text-white text-xs" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-3">
        <table className="w-full min-w-max text-xs">
          <thead>
            <tr className="border-b border-white/8 bg-white/3">
              {['User', 'Action', 'Cat.', 'Before', 'After', 'Delta', 'Date'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }, (_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <div className="h-3 bg-white/8 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No transactions found</td>
              </tr>
            ) : (
              filtered.map(t => {
                const delta = (t.diamond_balance_after ?? 0) - (t.diamond_balance_before ?? 0);
                return (

                  <tr key={t.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-white">@{t.username ?? t.user_id.slice(0, 8)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-white/70 max-w-[140px] truncate">{t.action_type}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {t.transaction_category ? (
                        <Badge className={`text-[9px] px-1.5 py-0 ${CATEGORY_BADGE[t.transaction_category] ?? 'bg-white/10 text-white border-white/20'}`}>
                          {t.transaction_category}
                        </Badge>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{t.diamond_balance_before ?? '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{t.diamond_balance_after ?? '—'}</td>
                    <td className={`px-3 py-2.5 whitespace-nowrap font-bold ${delta > 0 ? 'text-[#00FF88]' : delta < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {delta > 0 ? `+${delta}` : delta}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                      {new Date(t.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <span className="text-xs text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="h-7 px-3 text-xs border border-white/10">Prev</Button>
            <Button size="sm" variant="ghost" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}
              className="h-7 px-3 text-xs border border-white/10">Next</Button>
          </div>
        </div>
      )}
    </div>
    </AdminAuthGuard>
  );
}
