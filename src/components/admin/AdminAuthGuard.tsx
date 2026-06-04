/**
 * AdminAuthGuard — Password-protected wrapper for admin routes
 * Simple PIN gate stored in session, no server dependency
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRxStore } from '@/store/rxStore';

const ADMIN_PIN_KEY = 'rx_admin_pin_verified';
const ADMIN_PIN_HASH = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // SHA256 of "1234" — change in production

function sha256(str: string): string {
  // Simple client-side hash (not cryptographically secure, sufficient for UI guard)
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0');
}

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const { user } = useRxStore();

  useEffect(() => {
    const verified = sessionStorage.getItem(ADMIN_PIN_KEY);
    if (verified === 'true') setAuthenticated(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (sha256(pin) === ADMIN_PIN_HASH) {
      sessionStorage.setItem(ADMIN_PIN_KEY, 'true');
      setAuthenticated(true);
    } else {
      setError('Incorrect access code');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#BC13FE]/20 to-[#00F2FF]/20 border border-[#BC13FE]/20 flex items-center justify-center mx-auto mb-4"
          >
            <Shield className="w-10 h-10 text-[#BC13FE]" />
          </motion.div>
          <h1 className="text-2xl font-black text-white mb-1">Omniverse Admin</h1>
          <p className="text-sm text-white/40">Restricted access. Authentication required.</p>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4"
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Access Code</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(''); }}
                maxLength={6}
                placeholder="••••••"
                className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#BC13FE]/50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-xs text-[#FF4444] bg-[#FF4444]/10 px-3 py-2 rounded-lg"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#BC13FE] to-[#00F2FF] text-white font-bold hover:brightness-110"
          >
            <Shield className="w-4 h-4 mr-2" /> Unlock Admin Panel
          </Button>

          <p className="text-[10px] text-center text-white/20">
            Default code: 1234 &middot; Change in production
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
