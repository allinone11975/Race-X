/**
 * CREATOR LEADERBOARD — Rankings with diamond gifting
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Trophy, Diamond, TrendingUp, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';
import { useRxStore } from '@/store/rxStore';

interface LeaderEntry { user_id: string; username: string; avatar_url: string | null; ranking_score: number; ranking_badge: string; total_earnings_diamonds: number; }

const BADGE_COLORS: Record<string, string> = { Bronze: '#CD7F32', Silver: '#C0C0C0', Gold: '#FFD700', Platinum: '#E5E4E2', Diamond: '#00F2FF' };
const PERIODS = ['Today', 'This Week', 'This Month', 'All Time'];

export default function CreatorLeaderboard() {
  const navigate = useNavigate();
  const { user, updateDiamonds } = useRxStore();
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('All Time');
  const [giftTarget, setGiftTarget] = useState<LeaderEntry | null>(null);
  const [giftAmount, setGiftAmount] = useState('');
  const [gifting, setGifting] = useState(false);

  useEffect(() => { fetchLeaders(); }, []);

  const fetchLeaders = async () => {
    const { data } = await supabase
      .from('creator_stats')
      .select('user_id, ranking_score, ranking_badge, total_earnings_diamonds, users(username, avatar_url)')
      .order('ranking_score', { ascending: false })
      .limit(20);
    if (Array.isArray(data)) {
      setLeaders(data.map((d: any) => ({
        user_id: d.user_id,
        username: d.users?.username || 'Unknown',
        avatar_url: d.users?.avatar_url || null,
        ranking_score: d.ranking_score,
        ranking_badge: d.ranking_badge,
        total_earnings_diamonds: d.total_earnings_diamonds,
      })));
    }
    setLoading(false);
  };

  const sendGift = async () => {
    if (!giftTarget || !user) return;
    const amount = parseInt(giftAmount);
    if (isNaN(amount) || amount < 1) { toast.error('Enter a valid amount'); return; }
    if (amount > user.diamonds) { toast.error('Insufficient diamonds'); return; }
    setGifting(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not logged in');
      // Deduct from sender
      await supabase.from('transaction_ledger').insert({
        user_id: authUser.id,
        action_type: 'gift_sent',
        transaction_category: 'gifted',
        recipient_user_id: giftTarget.user_id,
        input_parameters: { amount, recipient: giftTarget.username },
        diamond_balance_before: user.diamonds,
        diamond_balance_after: user.diamonds - amount,
      });
      // Update local balance
      updateDiamonds(-amount);
      toast.success(`💎 ${amount} diamonds gifted to @${giftTarget.username}!`);
      setGiftTarget(null);
      setGiftAmount('');
    } catch {
      toast.error('Gift failed');
    } finally {
      setGifting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#FFD700]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-social')} className="p-2 rounded-lg border border-white/10 hover:border-[#FFD700]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="RANK" variant="purple" />
        <div>
          <h1 className="text-sm font-bold tracking-widest">CREATOR RANKINGS</h1>
          <p className="text-[10px] text-muted-foreground">Top Creators by Score</p>
        </div>
      </div>

      {/* Period filter */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-white/5">
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-full text-xs transition-all border ${period === p ? 'border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]' : 'border-white/10 text-muted-foreground'}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-2">
        {loading ? (
          Array.from({ length: 8 }, (_, i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)
        ) : leaders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No rankings yet</p>
          </div>
        ) : (
          leaders.map((l, i) => {
            const badgeColor = BADGE_COLORS[l.ranking_badge] || '#ffffff';
            const isTop3 = i < 3;
            return (
              <motion.div key={l.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isTop3 ? 'border-[#FFD700]/30 bg-[#FFD700]/5' : 'border-white/10 bg-white/[0.03]'}`}>
                {/* Rank */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-black ${i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : i === 1 ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' : i === 2 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' : 'bg-white/5 text-muted-foreground'}`}>
                  {i + 1}
                </div>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-white/10 border flex items-center justify-center shrink-0 overflow-hidden" style={{ borderColor: `${badgeColor}40` }}>
                  {l.avatar_url ? <img src={l.avatar_url} alt={l.username} className="w-full h-full object-cover" /> : <span className="text-sm font-bold">{l.username[0]?.toUpperCase()}</span>}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">@{l.username}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: badgeColor, backgroundColor: `${badgeColor}20` }}>{l.ranking_badge}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{l.ranking_score.toLocaleString()} pts</span>
                    <Diamond className="w-3 h-3 text-[#00F2FF]" />
                    <span className="text-[10px] text-[#00F2FF]">{l.total_earnings_diamonds.toLocaleString()}</span>
                  </div>
                </div>
                {/* Gift */}
                {user && l.user_id !== user.id && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 border border-[#BC13FE]/30 hover:border-[#BC13FE] hover:bg-[#BC13FE]/10"
                    onClick={() => setGiftTarget(l)}>
                    <Gift className="w-3.5 h-3.5 text-[#BC13FE]" />
                  </Button>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Gift Dialog */}
      <Dialog open={!!giftTarget} onOpenChange={() => { setGiftTarget(null); setGiftAmount(''); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-[#0A0A0F] border-[#BC13FE]/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#BC13FE]" />Gift Diamonds to @{giftTarget?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-[#00F2FF]/20 bg-[#00F2FF]/5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Your balance</span>
              <span className="text-sm font-bold text-[#00F2FF]">💎 {user?.diamonds ?? 0}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <Input value={giftAmount} onChange={(e) => setGiftAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter diamonds to gift" className="bg-white/5 border-white/10" type="number" min="1" />
            </div>
            <Button onClick={sendGift} disabled={gifting || !giftAmount}
              className="w-full bg-[#BC13FE]/20 border border-[#BC13FE]/40 text-[#BC13FE] font-bold">
              {gifting ? 'Sending...' : `💎 Send ${giftAmount || 0} Diamonds`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
