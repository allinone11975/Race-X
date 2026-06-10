/**
 * DiamondGateModal — Rewarded Ad gate before media export
 * Shows a simulated ad countdown; on completion grants diamonds + proceeds.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Diamond, Play, X, CheckCircle, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRxStore } from '@/store/rxStore';
import { supabase } from '@/db/supabase';

const AD_NETWORKS = ['AdMob', 'Meta Audience Network', 'AppLovin'];
const DIAMOND_REWARD = 5;
const AD_DURATION = 10; // seconds

interface DiamondGateModalProps {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
  requiredDiamonds?: number;
  actionLabel?: string;
}

export default function DiamondGateModal({
  open,
  onSuccess,
  onClose,
  requiredDiamonds = 0,
  actionLabel = 'Export',
}: DiamondGateModalProps) {
  const { user, updateDiamonds } = useRxStore();
  const [adState, setAdState] = useState<'idle' | 'watching' | 'rewarded'>('idle');
  const [countdown, setCountdown] = useState(AD_DURATION);
  const [network] = useState(() => AD_NETWORKS[Math.floor(Math.random() * AD_NETWORKS.length)]);

  useEffect(() => {
    if (!open) { setAdState('idle'); setCountdown(AD_DURATION); }
  }, [open]);

  useEffect(() => {
    if (adState !== 'watching') return;
    if (countdown <= 0) {
      setAdState('rewarded');
      grantReward();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [adState, countdown]);

  const grantReward = async () => {
    updateDiamonds(DIAMOND_REWARD);
    if (user?.id) {
      await supabase.from('transaction_ledger').insert({
        user_id: user.id,
        action_type: 'AD_REWARD',
        diamond_balance_before: user.diamonds,
        diamond_balance_after: user.diamonds + DIAMOND_REWARD,
        transaction_category: 'earned',
      });
      // Log ad impression for admin dashboard
      try {
        await supabase.from('ad_impressions').insert({
          user_id: user.id,
          network,
          diamonds_rewarded: DIAMOND_REWARD,
        });
      } catch { /* table may not exist yet */ }
    }
  };

  const hasSufficientDiamonds = (user?.diamonds ?? 0) >= requiredDiamonds;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm bg-[#0A0A0F] border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white/70">
            <X className="w-4 h-4" />
          </button>

          {adState === 'idle' && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center mx-auto">
                <Diamond className="w-8 h-8 text-[#FFD700]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white mb-1">Diamond Gate</h2>
                <p className="text-sm text-white/50">
                  {hasSufficientDiamonds && requiredDiamonds > 0
                    ? `Use ${requiredDiamonds} 💎 to ${actionLabel}`
                    : `Watch a short ad to earn ${DIAMOND_REWARD} 💎 and ${actionLabel}`}
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Diamond className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-sm text-white">Your balance</span>
                </div>
                <span className="text-lg font-black text-[#FFD700]">{user?.diamonds ?? 0} 💎</span>
              </div>

              {hasSufficientDiamonds && requiredDiamonds > 0 ? (
                <Button
                  className="w-full bg-[#FFD700] text-black font-bold hover:bg-[#FFD700]/90"
                  onClick={() => { onSuccess(); onClose(); }}
                >
                  <Diamond className="w-4 h-4 mr-2" /> Use {requiredDiamonds} 💎 & {actionLabel}
                </Button>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-[#BC13FE] to-[#00F2FF] text-white font-bold"
                  onClick={() => { setAdState('watching'); setCountdown(AD_DURATION); }}
                >
                  <Play className="w-4 h-4 mr-2" /> Watch Ad & Earn {DIAMOND_REWARD} 💎
                </Button>
              )}
            </div>
          )}

          {adState === 'watching' && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                <Tv className="w-8 h-8 text-white/60 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white mb-1">Ad Playing…</h2>
                <p className="text-sm text-white/40">{network} · Rewarded Video</p>
              </div>

              {/* Fake ad screen */}
              <div className="w-full h-32 bg-gradient-to-br from-white/5 to-white/10 rounded-xl flex items-center justify-center border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#BC13FE]/10 via-transparent to-[#00F2FF]/10 animate-pulse" />
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Ad by {network}</p>
              </div>

              {/* Countdown ring */}
              <div className="relative w-14 h-14 mx-auto">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="4" />
                  <circle
                    cx="28" cy="28" r="24" fill="none"
                    stroke="#00F2FF" strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (countdown / AD_DURATION)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
                  {countdown}
                </span>
              </div>

              <p className="text-xs text-white/30">Please wait {countdown}s…</p>
            </div>
          )}

          {adState === 'rewarded' && (
            <div className="space-y-5 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-16 h-16 rounded-2xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center mx-auto"
              >
                <CheckCircle className="w-8 h-8 text-[#00FF88]" />
              </motion.div>
              <div>
                <h2 className="text-xl font-black text-white mb-1">+{DIAMOND_REWARD} 💎 Earned!</h2>
                <p className="text-sm text-white/50">Thank you for watching. Proceeding to {actionLabel}…</p>
              </div>
              <Button
                className="w-full bg-[#00FF88] text-black font-bold hover:bg-[#00FF88]/90"
                onClick={() => { onSuccess(); onClose(); }}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Proceed to {actionLabel}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
