/**
 * AdminAuthGuard — Supabase role-based access control
 * Grants access to accounts with role = 'admin' or 'super_admin'.
 * No hardcoded PIN, no frontend secrets, no localStorage bypass.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useRxStore, isAdminRole } from '@/store/rxStore';
import { useNavigate } from 'react-router-dom';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

type AuthState = 'loading' | 'authorized' | 'unauthorized' | 'unauthenticated';

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const { user } = useRxStore();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      // 1. Fast-path: role already in store
      if (user && isAdminRole(user.role)) {
        if (!cancelled) setAuthState('authorized');
        return;
      }

      // 2. Verify via Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) setAuthState('unauthenticated');
        return;
      }

      // 3. Fetch role server-side via secure RPC (SECURITY DEFINER)
      const { data: role, error } = await supabase.rpc('get_my_role');
      if (cancelled) return;

      if (error || !isAdminRole(role)) {
        setAuthState('unauthorized');
      } else {
        setAuthState('authorized');
      }
    }

    checkAccess();
    return () => { cancelled = true; };
  }, [user]);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#BC13FE] animate-spin" />
          <p className="text-sm text-white/40 tracking-wider">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (authState === 'authorized') return <>{children}</>;

  const isLoggedOut = authState === 'unauthenticated';

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF4444]/20 to-[#BC13FE]/20 border border-[#FF4444]/20 flex items-center justify-center mx-auto mb-6"
        >
          {isLoggedOut ? (
            <Lock className="w-10 h-10 text-[#FF4444]" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-[#FF4444]" />
          )}
        </motion.div>

        <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
        <p className="text-sm text-white/40 mb-8 text-pretty">
          {isLoggedOut
            ? 'You must be signed in to access this area.'
            : 'Your account does not have permission to view admin controls.'}
        </p>

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            {isLoggedOut && (
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#BC13FE] to-[#00F2FF] text-white font-bold hover:brightness-110 transition-all"
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Sign In
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl border border-white/10 text-white/60 font-medium hover:border-white/20 hover:text-white/80 transition-all"
            >
              Return Home
            </button>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

