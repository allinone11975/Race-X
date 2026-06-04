/**
 * CREATOR DASHBOARD — Analytics, earnings, ranking
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, Eye, Heart, Share2, Diamond, BarChart3, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';
import type { CreatorStats } from '@/types/race-x';

const BADGE_ORDER = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const BADGE_COLORS: Record<string, string> = { Bronze: '#CD7F32', Silver: '#C0C0C0', Gold: '#FFD700', Platinum: '#E5E4E2', Diamond: '#00F2FF' };
const BADGE_THRESHOLDS = [0, 1000, 5000, 20000, 100000];

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('creator_stats').select('*').eq('user_id', user.id).maybeSingle();
    setStats(data as CreatorStats | null);
    setLoading(false);
  };

  const statCards = stats ? [
    { label: 'Total Views', value: stats.total_views.toLocaleString(), icon: Eye, color: '#00F2FF' },
    { label: 'Total Likes', value: stats.total_likes.toLocaleString(), icon: Heart, color: '#BC13FE' },
    { label: 'Total Shares', value: stats.total_shares.toLocaleString(), icon: Share2, color: '#00FF88' },
    { label: 'Diamonds Earned', value: stats.total_earnings_diamonds.toLocaleString(), icon: Diamond, color: '#FFD700' },
  ] : [];

  const badgeIdx = stats ? BADGE_ORDER.indexOf(stats.ranking_badge) : 0;
  const nextBadge = BADGE_ORDER[badgeIdx + 1];
  const currentThresh = BADGE_THRESHOLDS[badgeIdx];
  const nextThresh = BADGE_THRESHOLDS[badgeIdx + 1] ?? BADGE_THRESHOLDS[badgeIdx];
  const progress = stats
    ? Math.min(100, ((stats.ranking_score - currentThresh) / (nextThresh - currentThresh + 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/gateway')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="DASH" />
        <div>
          <h1 className="text-sm font-bold tracking-widest">CREATOR DASHBOARD</h1>
          <p className="text-[10px] text-muted-foreground">Your Performance Analytics</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {loading ? (
          <>
            <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          </>
        ) : !stats ? (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No creator stats yet</p>
            <p className="text-xs mt-1">Start posting to earn rankings</p>
          </div>
        ) : (
          <>
            {/* Badge card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border overflow-hidden relative"
              style={{ borderColor: `${BADGE_COLORS[stats.ranking_badge]}40`, backgroundColor: `${BADGE_COLORS[stats.ranking_badge]}08` }}>
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="w-8 h-8" style={{ color: BADGE_COLORS[stats.ranking_badge] }} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black" style={{ color: BADGE_COLORS[stats.ranking_badge] }}>{stats.ranking_badge}</span>
                    <span className="text-xs text-muted-foreground">Creator</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{stats.ranking_score.toLocaleString()} ranking points</p>
                </div>
              </div>
              {nextBadge && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Progress to {nextBadge}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}
            </motion.div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {statCards.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
                    className="p-4 rounded-xl border bg-white/[0.03] h-full" style={{ borderColor: `${s.color}25` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: s.color }} />
                      <span className="text-[10px] text-muted-foreground">{s.label}</span>
                    </div>
                    <p className="text-xl font-black text-white">{s.value}</p>
                  </motion.div>
                );
              })}
            </div>

            <Button onClick={() => navigate('/rx-social/leaderboard')} className="w-full border border-[#BC13FE]/30 bg-[#BC13FE]/10 text-[#BC13FE]">
              <Trophy className="w-4 h-4 mr-2" />View Global Leaderboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
