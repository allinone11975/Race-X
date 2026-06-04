/**
 * WALLET PAGE — Diamond balance, transactions, top-up, gifting
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Diamond, ArrowUpRight, ArrowDownLeft, Gift, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';
import { useRxStore } from '@/store/rxStore';

interface TxRow { id: string; action_type: string; transaction_category: string; diamond_balance_before: number; diamond_balance_after: number; created_at: string; }

const TOPUP_PACKAGES = [
  { diamonds: 100, label: '100 💎', price: '$0.99' },
  { diamonds: 500, label: '500 💎', price: '$3.99' },
  { diamonds: 1000, label: '1,000 💎', price: '$6.99' },
  { diamonds: 5000, label: '5,000 💎', price: '$29.99' },
];

const CAT_ICON = { earned: TrendingUp, spent: ArrowUpRight, gifted: Gift, received: ArrowDownLeft, referral: Plus };
const CAT_COLOR = { earned: '#00FF88', spent: '#FF4444', gifted: '#BC13FE', received: '#00F2FF', referral: '#FFD700' };

export default function WalletPage() {
  const navigate = useNavigate();
  const { user, updateDiamonds } = useRxStore();
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftUsername, setGiftUsername] = useState('');
  const [giftAmount, setGiftAmount] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setLoading(false); return; }
    const { data } = await supabase
      .from('transaction_ledger')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const sendGift = async () => {
    if (!giftUsername || !giftAmount) return;
    const amount = parseInt(giftAmount);
    if (isNaN(amount) || amount < 1) { toast.error('Invalid amount'); return; }
    if (!user || amount > user.diamonds) { toast.error('Insufficient diamonds'); return; }
    setSending(true);
    try {
      const { data: recipient } = await supabase.from('users').select('id').eq('username', giftUsername).maybeSingle();
      if (!recipient) { toast.error('User not found'); return; }
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not logged in');
      await supabase.from('transaction_ledger').insert({
        user_id: authUser.id,
        action_type: 'gift_sent',
        transaction_category: 'gifted',
        recipient_user_id: recipient.id,
        input_parameters: { amount, recipient: giftUsername },
        diamond_balance_before: user.diamonds,
        diamond_balance_after: user.diamonds - amount,
      });
      updateDiamonds(-amount);
      toast.success(`💎 ${amount} diamonds gifted to @${giftUsername}!`);
      setGiftOpen(false); setGiftUsername(''); setGiftAmount('');
      fetchTransactions();
    } catch { toast.error('Gift failed'); }
    finally { setSending(false); }
  };

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.transaction_category === filter);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/gateway')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="WALLET" />
        <h1 className="text-sm font-bold tracking-widest">WALLET</h1>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Balance card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-[#00F2FF]/30 bg-gradient-to-br from-[#00F2FF]/10 to-[#BC13FE]/10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #00F2FF 0px, #00F2FF 1px, transparent 0px, transparent 50%)' }} />
          <p className="text-xs text-muted-foreground tracking-widest mb-1">DIAMOND BALANCE</p>
          <div className="flex items-center gap-3">
            <Diamond className="w-8 h-8 text-[#00F2FF]" />
            <span className="text-4xl font-black text-white">{(user?.diamonds ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setTopUpOpen(true)} size="sm" className="flex-1 bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF] font-bold text-xs">
              <Plus className="w-3 h-3 mr-1" />Top Up
            </Button>
            <Button onClick={() => setGiftOpen(true)} size="sm" className="flex-1 bg-[#BC13FE]/20 border border-[#BC13FE]/40 text-[#BC13FE] font-bold text-xs">
              <Gift className="w-3 h-3 mr-1" />Gift
            </Button>
          </div>
        </motion.div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
          {['all', 'earned', 'spent', 'gifted', 'received'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs border transition-all ${filter === f ? 'border-[#00F2FF] bg-[#00F2FF]/10 text-[#00F2FF]' : 'border-white/10 text-muted-foreground'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Transactions */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Transaction History</p>
          {loading ? (
            Array.from({ length: 5 }, (_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Diamond className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            filtered.map((tx) => {
              const cat = (tx.transaction_category || 'spent') as keyof typeof CAT_ICON;
              const Icon = CAT_ICON[cat] || ArrowUpRight;
              const color = CAT_COLOR[cat] || '#ffffff';
              const delta = (tx.diamond_balance_after ?? 0) - (tx.diamond_balance_before ?? 0);
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.03]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{tx.action_type.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${delta >= 0 ? 'text-[#00FF88]' : 'text-[#FF4444]'}`}>
                    {delta >= 0 ? '+' : ''}{delta} 💎
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Top Up Dialog */}
      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-[#0A0A0F] border-[#00F2FF]/30">
          <DialogHeader><DialogTitle className="text-white">Top Up Diamonds</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {TOPUP_PACKAGES.map(pkg => (
              <button key={pkg.diamonds} onClick={() => { toast.info('Payment integration coming soon!'); setTopUpOpen(false); }}
                className="p-3 rounded-xl border border-[#00F2FF]/20 bg-[#00F2FF]/5 hover:border-[#00F2FF]/50 hover:bg-[#00F2FF]/10 transition-all text-center">
                <p className="text-lg font-black text-white">{pkg.label}</p>
                <p className="text-sm text-[#00F2FF]">{pkg.price}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Gift Dialog */}
      <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-[#0A0A0F] border-[#BC13FE]/30">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Gift className="w-4 h-4 text-[#BC13FE]" />Gift Diamonds</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Recipient Username</Label>
              <Input value={giftUsername} onChange={(e) => setGiftUsername(e.target.value)} placeholder="@username" className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <Input value={giftAmount} onChange={(e) => setGiftAmount(e.target.value.replace(/\D/g, ''))} placeholder="Diamonds" type="number" className="bg-white/5 border-white/10" />
            </div>
            <Button onClick={sendGift} disabled={sending || !giftUsername || !giftAmount} className="w-full bg-[#BC13FE]/20 border border-[#BC13FE]/40 text-[#BC13FE] font-bold">
              {sending ? 'Sending...' : `💎 Send Diamonds`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
