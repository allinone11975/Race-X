/**
 * ADMIN LOCKDOWN CONTROL — Platform-wide kill switch
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Lock, Unlock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { useRxStore } from '@/store/rxStore';
import { supabase } from '@/db/supabase';

export default function AdminLockdownControl() {
  const navigate = useNavigate();
  const { isLockdownMode, setLockdownMode } = useRxStore();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [processing, setProcessing] = useState(false);

  const CONFIRM_PHRASE = 'LOCKDOWN CONFIRMED';

  const toggleLockdown = async () => {
    if (!isLockdownMode && confirm !== CONFIRM_PHRASE) {
      toast.error(`Type "${CONFIRM_PHRASE}" to confirm`);
      return;
    }
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newState = !isLockdownMode;
      await supabase.from('app_configurations').upsert({
        config_key: 'lockdown_mode',
        config_value: { active: newState, reason: reason || 'Admin action', activated_by: user?.id, timestamp: new Date().toISOString() },
      }, { onConflict: 'config_key' });
      setLockdownMode(newState);
      toast[newState ? 'warning' : 'success'](
        newState ? '🔒 Platform LOCKED DOWN' : '🔓 Lockdown LIFTED — Platform restored'
      );
      setReason(''); setConfirm('');
    } catch { toast.error('Failed to toggle lockdown'); }
    finally { setProcessing(false); }
  };

  return (
    <AdminAuthGuard>
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-red-500/20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="p-2 rounded-lg border border-white/10"><ArrowLeft className="w-4 h-4" /></button>
        <RxBadge label="LOCK" variant="purple" />
        <h1 className="text-sm font-bold tracking-widest text-red-400">LOCKDOWN CONTROL</h1>
      </div>

      <div className="p-4 max-w-sm mx-auto space-y-4 pt-8">
        {/* Status indicator */}
        <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }}
          className={`p-6 rounded-2xl border text-center ${isLockdownMode ? 'border-red-500/50 bg-red-500/10' : 'border-green-500/30 bg-green-500/5'}`}>
          {isLockdownMode
            ? <Lock className="w-16 h-16 text-red-500 mx-auto mb-3" />
            : <Unlock className="w-16 h-16 text-green-400 mx-auto mb-3" />}
          <p className={`text-xl font-black ${isLockdownMode ? 'text-red-400' : 'text-green-400'}`}>
            {isLockdownMode ? 'PLATFORM LOCKED' : 'PLATFORM ACTIVE'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isLockdownMode ? 'All user access blocked. Admin-only mode.' : 'All systems operational.'}
          </p>
        </motion.div>

        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-400">EXTREME CAUTION</p>
            <p className="text-[10px] text-red-400/70 mt-0.5">Lockdown immediately blocks all user access. Use only for security emergencies.</p>
          </div>
        </div>

        {!isLockdownMode && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Reason for lockdown</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Security breach, maintenance..." className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Type <span className="text-red-400 font-mono">{CONFIRM_PHRASE}</span> to confirm</Label>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={CONFIRM_PHRASE} className="bg-white/5 border-red-500/20 font-mono text-sm" />
            </div>
          </div>
        )}

        <Button onClick={toggleLockdown} disabled={processing || (!isLockdownMode && confirm !== CONFIRM_PHRASE)}
          className={`w-full font-black text-base h-12 border-2 ${isLockdownMode ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'}`}>
          {processing ? 'Processing...'
            : isLockdownMode
            ? <><Unlock className="w-5 h-5 mr-2" />LIFT LOCKDOWN</>
            : <><Lock className="w-5 h-5 mr-2" />INITIATE LOCKDOWN</>}
        </Button>
      </div>
    </div>
    </AdminAuthGuard>
  );
}
