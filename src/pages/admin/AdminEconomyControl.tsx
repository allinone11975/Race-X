/**
 * ADMIN ECONOMY CONTROL — Diamond issuance, multipliers, ledger view
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Diamond, TrendingUp, AlertTriangle, Plus, Minus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';

interface EcoStats { total_users: number; total_diamonds_in_circulation: number; total_transactions: number; }

export default function AdminEconomyControl() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<EcoStats | null>(null);
  const [targetUsername, setTargetUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    const [usersRes, txRes] = await Promise.all([
      supabase.from('users').select('diamonds'),
      supabase.from('transaction_ledger').select('id', { count: 'exact', head: true }),
    ]);
    const users = Array.isArray(usersRes.data) ? usersRes.data : [];
    const totalDiamonds = users.reduce((s: number, u: any) => s + (u.diamonds || 0), 0);
    setStats({
      total_users: users.length,
      total_diamonds_in_circulation: totalDiamonds,
      total_transactions: txRes.count || 0,
    });
    setLoading(false);
  };

  const adjustBalance = async () => {
    if (!targetUsername || !amount) { toast.error('Fill all fields'); return; }
    const delta = parseInt(amount);
    if (isNaN(delta) || delta <= 0) { toast.error('Invalid amount'); return; }
    setProcessing(true);
    try {
      const { data: target } = await supabase.from('users').select('id, diamonds').eq('username', targetUsername).maybeSingle();
      if (!target) { toast.error('User not found'); return; }
      const newBalance = operation === 'add' ? (target.diamonds + delta) : Math.max(0, target.diamonds - delta);
      const { error } = await supabase.from('users').update({ diamonds: newBalance }).eq('id', target.id);
      if (error) throw error;
      const { data: { user: admin } } = await supabase.auth.getUser();
      await supabase.from('transaction_ledger').insert({
        user_id: target.id,
        action_type: `admin_${operation === 'add' ? 'credit' : 'debit'}`,
        transaction_category: operation === 'add' ? 'earned' : 'spent',
        input_parameters: { admin_id: admin?.id, reason, amount: delta },
        diamond_balance_before: target.diamonds,
        diamond_balance_after: newBalance,
      });
      toast.success(`${operation === 'add' ? '✅ Added' : '🔻 Removed'} ${delta} diamonds ${operation === 'add' ? 'to' : 'from'} @${targetUsername}`);
      setTargetUsername(''); setAmount(''); setReason('');
      fetchStats();
    } catch { toast.error('Operation failed'); }
    finally { setProcessing(false); }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#FFD700]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="p-2 rounded-lg border border-white/10"><ArrowLeft className="w-4 h-4" /></button>
        <RxBadge label="ECONOMY" variant="purple" />
        <h1 className="text-sm font-bold tracking-widest">ECONOMY CONTROL</h1>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Users', value: stats.total_users.toLocaleString(), color: '#00F2FF' },
              { label: '💎 Supply', value: stats.total_diamonds_in_circulation.toLocaleString(), color: '#FFD700' },
              { label: 'Txns', value: stats.total_transactions.toLocaleString(), color: '#00FF88' },
            ].map(s => (
              <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-xl border border-white/10 bg-white/[0.03] text-center">
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-black mt-1" style={{ color: s.color }}>{s.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Adjust */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-[#FFD700]/20 bg-white/[0.03] space-y-3">
          <div className="flex items-center gap-2">
            <Diamond className="w-4 h-4 text-[#FFD700]" />
            <span className="text-xs font-bold tracking-widest text-[#FFD700]">BALANCE ADJUSTMENT</span>
          </div>
          <div className="p-2 rounded border border-red-500/20 bg-red-500/5 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
            <p className="text-[10px] text-red-400">Admin action — all operations are logged.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Target Username</Label>
            <Input value={targetUsername} onChange={(e) => setTargetUsername(e.target.value)} placeholder="@username" className="bg-white/5 border-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Operation</Label>
              <Select value={operation} onValueChange={(v) => setOperation(v as 'add' | 'subtract')}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add"><span className="text-green-400">+ Add Diamonds</span></SelectItem>
                  <SelectItem value="subtract"><span className="text-red-400">− Remove Diamonds</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" type="number" className="bg-white/5 border-white/10" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bonus, penalty, correction..." className="bg-white/5 border-white/10" />
          </div>
          <Button onClick={adjustBalance} disabled={processing}
            className={`w-full font-bold ${operation === 'add' ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-red-500/20 border-red-500/40 text-red-400'} border`}>
            {processing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              : operation === 'add'
              ? <><Plus className="w-4 h-4 mr-2" />Credit Diamonds</>
              : <><Minus className="w-4 h-4 mr-2" />Debit Diamonds</>}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
