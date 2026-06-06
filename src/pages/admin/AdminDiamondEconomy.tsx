/**
 * Admin Diamond Economy Viewer
 * Full transaction ledger + atomic history + user balance management
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Gem, RefreshCw, Download, Search, Filter,
  TrendingUp, TrendingDown, ArrowUpDown, Plus, Minus, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface DiamondTx {
  id: string;
  user_id: string;
  tx_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  tool: string | null;
  description: string;
  idempotency_key: string | null;
  created_at: string;
}

const TX_TYPE_CFG: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  spend:       { color: '#FF4444', bg: 'bg-red-500/10 border-red-400/20',       label: 'Spend',       icon: <Minus className="w-3 h-3" /> },
  earn:        { color: '#00FF88', bg: 'bg-[#00FF88]/10 border-[#00FF88]/20',   label: 'Earn',        icon: <Plus className="w-3 h-3" /> },
  reward:      { color: '#00FF88', bg: 'bg-[#00FF88]/10 border-[#00FF88]/20',   label: 'Reward',      icon: <Plus className="w-3 h-3" /> },
  gift:        { color: '#BC13FE', bg: 'bg-[#BC13FE]/10 border-[#BC13FE]/20',   label: 'Gift',        icon: <Gem className="w-3 h-3" /> },
  refund:      { color: '#00F2FF', bg: 'bg-[#00F2FF]/10 border-[#00F2FF]/20',   label: 'Refund',      icon: <ArrowUpDown className="w-3 h-3" /> },
  admin_grant: { color: '#FFD700', bg: 'bg-[#FFD700]/10 border-[#FFD700]/20',   label: 'Admin Grant', icon: <Plus className="w-3 h-3" /> },
  admin_deduct:{ color: '#FF6B35', bg: 'bg-[#FF6B35]/10 border-[#FF6B35]/20',   label: 'Admin Deduct',icon: <Minus className="w-3 h-3" /> },
  referral:    { color: '#00F2FF', bg: 'bg-[#00F2FF]/10 border-[#00F2FF]/20',   label: 'Referral',    icon: <User className="w-3 h-3" /> },
  ad_watch:    { color: '#00FF88', bg: 'bg-[#00FF88]/10 border-[#00FF88]/20',   label: 'Ad Watch',    icon: <TrendingUp className="w-3 h-3" /> },
};

export default function AdminDiamondEconomy() {
  const navigate = useNavigate();
  const [txns, setTxns] = useState<DiamondTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [adminDialog, setAdminDialog] = useState(false);
  const [adminUserId, setAdminUserId] = useState('');
  const [adminAmount, setAdminAmount] = useState('');
  const [adminType, setAdminType] = useState<'admin_grant' | 'admin_deduct'>('admin_grant');
  const [adminDesc, setAdminDesc] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);
  const PAGE = 50;

  const totalSpent  = txns.filter(t => ['spend', 'admin_deduct'].includes(t.tx_type)).reduce((s, t) => s + t.amount, 0);
  const totalEarned = txns.filter(t => ['earn', 'reward', 'ad_watch', 'referral', 'admin_grant', 'gift'].includes(t.tx_type)).reduce((s, t) => s + t.amount, 0);

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('diamond_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (typeFilter !== 'all') query = query.eq('tx_type', typeFilter);
    if (search) query = query.ilike('description', `%${search}%`);
    const { data } = await query;
    setTxns((data as DiamondTx[]) ?? []);
    setLoading(false);
  }, [typeFilter, search, page]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  const adminAdjust = async () => {
    if (!adminUserId.trim() || !adminAmount || Number(adminAmount) <= 0) {
      toast.error('Enter valid user ID and amount');
      return;
    }
    setAdminSaving(true);
    const fn = adminType === 'admin_grant' ? 'earn_diamonds' : 'spend_diamonds';
    try {
      const { data, error } = await supabase.rpc(fn === 'earn_diamonds' ? 'earn_diamonds' : 'spend_diamonds', {
        p_user_id:     adminUserId.trim(),
        p_amount:      Number(adminAmount),
        p_tx_type:     adminType,
        p_description: adminDesc || `Admin ${adminType === 'admin_grant' ? 'grant' : 'deduction'}`,
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data?.error);
      toast.success(`${adminType === 'admin_grant' ? '+' : '-'}${adminAmount} 💎 applied`);
      setAdminDialog(false);
      setAdminUserId(''); setAdminAmount(''); setAdminDesc('');
      fetchTxns();
    } catch (e) {
      toast.error('Admin adjustment failed');
    }
    setAdminSaving(false);
  };

  const exportCSV = () => {
    const rows = [['id', 'user_id', 'type', 'amount', 'balance_before', 'balance_after', 'tool', 'description', 'created_at'].join(',')];
    txns.forEach(t => rows.push([t.id, t.user_id, t.tx_type, t.amount, t.balance_before, t.balance_after, t.tool ?? '', `"${t.description}"`, t.created_at].join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'diamond_transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white pb-12">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <button onClick={() => navigate('/admin/omniverse')} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Gem className="w-4 h-4 text-[#BC13FE] shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black tracking-widest">DIAMOND ECONOMY</h1>
              <p className="text-[10px] text-white/40">Atomic transaction ledger · anti-double-spend · admin controls</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={() => setAdminDialog(true)}
                className="h-8 px-3 text-xs bg-[#BC13FE]/10 border border-[#BC13FE]/30 text-[#BC13FE] hover:bg-[#BC13FE]/20">
                <Gem className="w-3 h-3 mr-1" /> Adjust
              </Button>
              <Button size="sm" onClick={exportCSV}
                className="h-8 px-3 text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white">
                <Download className="w-3 h-3 mr-1" /> CSV
              </Button>
              <button onClick={fetchTxns} className="p-2 rounded-lg border border-white/10 hover:bg-white/5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-white/[0.03] border-white/8 rounded-xl">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1"><TrendingUp className="w-3 h-3 text-[#00FF88]" /></div>
                <p className="text-xl font-black text-[#00FF88]">+{loading ? '…' : totalEarned.toLocaleString()}</p>
                <p className="text-[9px] text-white/40">Earned (page)</p>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/8 rounded-xl">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1"><TrendingDown className="w-3 h-3 text-red-400" /></div>
                <p className="text-xl font-black text-red-400">-{loading ? '…' : totalSpent.toLocaleString()}</p>
                <p className="text-[9px] text-white/40">Spent (page)</p>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/8 rounded-xl">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1"><Gem className="w-3 h-3 text-[#BC13FE]" /></div>
                <p className="text-xl font-black text-[#BC13FE]">{loading ? '…' : txns.length}</p>
                <p className="text-[9px] text-white/40">Transactions</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[160px] max-w-[260px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search description…"
                className="h-8 pl-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="spend">Spend</SelectItem>
                <SelectItem value="earn">Earn</SelectItem>
                <SelectItem value="reward">Reward</SelectItem>
                <SelectItem value="ad_watch">Ad Watch</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="admin_grant">Admin Grant</SelectItem>
                <SelectItem value="admin_deduct">Admin Deduct</SelectItem>
                <SelectItem value="gift">Gift</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : txns.length === 0 ? (
            <div className="py-16 text-center">
              <Gem className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Type', 'Amount', 'Balance After', 'Tool', 'Description', 'User', 'Time'].map(h => (
                      <th key={h} className="text-left text-[9px] text-white/30 uppercase tracking-wider pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {txns.map((t, i) => {
                    const cfg = TX_TYPE_CFG[t.tx_type] ?? TX_TYPE_CFG.earn;
                    const isPositive = ['earn', 'reward', 'ad_watch', 'referral', 'admin_grant', 'gift', 'refund'].includes(t.tx_type);
                    return (
                      <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                        className="hover:bg-white/5 transition-colors">
                        <td className="py-2 pr-3">
                          <Badge className={`text-[9px] px-1.5 py-0 border ${cfg.bg} whitespace-nowrap`} style={{ color: cfg.color }}>
                            <span className="mr-1">{cfg.icon}</span>{cfg.label}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs font-black whitespace-nowrap ${isPositive ? 'text-[#00FF88]' : 'text-red-400'}`}>
                            {isPositive ? '+' : '-'}{t.amount.toLocaleString()} 💎
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-xs text-white/60 whitespace-nowrap">{t.balance_after.toLocaleString()}</td>
                        <td className="py-2 pr-3">
                          {t.tool && <Badge className="text-[9px] px-1.5 py-0 bg-white/5 border-white/10 text-white/40 whitespace-nowrap">{t.tool}</Badge>}
                        </td>
                        <td className="py-2 pr-3 text-xs text-white/50 max-w-[200px] truncate">{t.description}</td>
                        <td className="py-2 pr-3 text-[10px] text-white/30 font-mono whitespace-nowrap">{t.user_id.slice(0, 8)}…</td>
                        <td className="py-2 text-[10px] text-white/30 whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <Button size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="h-8 px-3 text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-30">
              ← Prev
            </Button>
            <span className="text-xs text-white/30">Page {page + 1}</span>
            <Button size="sm" disabled={txns.length < PAGE} onClick={() => setPage(p => p + 1)}
              className="h-8 px-3 text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-30">
              Next →
            </Button>
          </div>
        </div>

        {/* Admin Diamond Adjustment Dialog */}
        <Dialog open={adminDialog} onOpenChange={setAdminDialog}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-[#0d0d1a] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-sm font-black">Admin Diamond Adjustment</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-white/40 block mb-1">User ID (UUID)</label>
                <Input value={adminUserId} onChange={e => setAdminUserId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="h-8 text-xs bg-white/5 border-white/10 text-white font-mono placeholder:text-white/20" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Action</label>
                <Select value={adminType} onValueChange={v => setAdminType(v as typeof adminType)}>
                  <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                    <SelectItem value="admin_grant">Grant Diamonds (+)</SelectItem>
                    <SelectItem value="admin_deduct">Deduct Diamonds (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Amount</label>
                <Input type="number" min={1} value={adminAmount} onChange={e => setAdminAmount(e.target.value)}
                  placeholder="100"
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Reason</label>
                <Input value={adminDesc} onChange={e => setAdminDesc(e.target.value)}
                  placeholder="Compensation for service outage"
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              </div>
              <div className="p-2 rounded-lg bg-[#FFD700]/5 border border-[#FFD700]/20">
                <p className="text-[10px] text-[#FFD700]/80">⚠ This action is atomic and logged. It cannot be reversed without a manual refund.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={adminAdjust} disabled={adminSaving}
                  className="flex-1 h-9 bg-[#BC13FE]/10 border border-[#BC13FE]/30 text-[#BC13FE] hover:bg-[#BC13FE]/20 text-xs font-bold">
                  {adminSaving ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Gem className="w-3 h-3 mr-1" />}
                  {adminSaving ? 'Processing…' : 'Apply'}
                </Button>
                <Button onClick={() => setAdminDialog(false)}
                  className="flex-1 h-9 bg-white/5 border border-white/10 text-white/60 hover:text-white text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminAuthGuard>
  );
}
