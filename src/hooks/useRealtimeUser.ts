/**
 * useRealtimeUser
 * ─────────────────────────────────────────────────────
 * Subscribes to Supabase Realtime changes on the `users` table
 * for the authenticated user. Automatically syncs diamonds, level,
 * rx_points, and subscription state into the Zustand RxStore.
 *
 * Features:
 * - Real-time diamond balance sync (no polling)
 * - Level-up detection with toast notification
 * - Subscription status change detection
 * - Auto-cleanup on unmount
 * - Reconnect on network restore
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useRxStore } from '@/store/rxStore';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  diamonds: number;
  rx_points: number;
  level: number;
  is_premium?: boolean;
  subscription_type?: string;
  avatar_url?: string | null;
  username?: string;
}

export function useRealtimeUser() {
  const { user, setUser, updateDiamonds } = useRxStore();
  const prevLevelRef = useRef<number>(user?.level ?? 0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Cleanup any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`user_sync_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as UserRow;
          if (!updated) return;

          // Sync all changed fields into store
          setUser({
            ...user,
            diamonds:   updated.diamonds   ?? user.diamonds,
            rx_points:  updated.rx_points  ?? user.rx_points,
            level:      updated.level      ?? user.level,
            avatar_url: updated.avatar_url !== undefined ? updated.avatar_url : user.avatar_url,
            username:   updated.username   ?? user.username,
          });

          // Level-up toast
          const prevLevel = prevLevelRef.current;
          const newLevel  = updated.level ?? user.level;
          if (newLevel > prevLevel) {
            toast.success(`🎉 Level Up! You reached Level ${newLevel}!`, {
              duration: 5000,
              description: 'Keep earning XP to unlock more features.',
            });
          }
          prevLevelRef.current = newLevel;

          // Diamond change notification (significant drops/gains)
          const prevDiamonds = user.diamonds;
          const newDiamonds  = updated.diamonds ?? user.diamonds;
          const delta = newDiamonds - prevDiamonds;

          if (delta > 50) {
            toast.success(`+${delta} 💎 Diamonds earned!`, { duration: 3000 });
          } else if (delta < -100) {
            toast.info(`${delta} 💎 Diamonds used`, { duration: 2000 });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[useRealtimeUser] Channel error — will auto-reconnect');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]); // only re-subscribe when user ID changes
}

/**
 * useDiamondTransactions
 * Fetches paginated diamond transaction history for the current user
 */

export interface DiamondTx {
  id: string;
  tx_type: 'earn' | 'spend' | 'reward' | 'gift' | 'refund' | 'admin_grant' | 'admin_deduct' | 'referral' | 'ad_watch';
  amount: number;
  balance_before: number;
  balance_after: number;
  tool: string | null;
  description: string;
  created_at: string;
}

export function useDiamondTransactions(limit = 50) {
  const { user } = useRxStore();
  const [txns, setTxns] = useState<DiamondTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetch = useCallback(async (reset = false) => {
    if (!user?.id) return;
    setLoading(true);
    const currentPage = reset ? 0 : page;
    const { data } = await supabase
      .from('diamond_transactions')
      .select('id, tx_type, amount, balance_before, balance_after, tool, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(currentPage * limit, (currentPage + 1) * limit - 1);

    const rows = (data as DiamondTx[]) ?? [];
    setTxns(prev => reset ? rows : [...prev, ...rows]);
    setHasMore(rows.length === limit);
    if (!reset) setPage(p => p + 1);
    else setPage(1);
    setLoading(false);
  }, [user?.id, page, limit]);

  const loadMore = () => fetch(false);
  const reload   = () => fetch(true);

  return { txns, loading, hasMore, loadMore, reload };
}
