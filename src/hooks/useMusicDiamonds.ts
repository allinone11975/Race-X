/**
 * RACE-X  ·  Music Diamond Economy Hook
 * Studio Mode: 5 diamonds per 30s clip
 * Live Radio: 1 diamond per 30 minutes
 * Zero-balance: auto-pause + notify
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { updateUserDiamonds, verifyDiamondBalance } from '@/db/api';

export const STUDIO_DIAMOND_COST = 5;
export const RADIO_DIAMOND_COST_30MIN = 1;

interface DiamondState {
  balance: number;
  loading: boolean;
}

export function useMusicDiamonds(userId: string | null) {
  const [state, setState] = useState<DiamondState>({ balance: 0, loading: true });

  // Fetch balance on mount + real-time sync
  useEffect(() => {
    if (!userId) return;
    fetchBalance();

    const channel = supabase
      .channel(`music_diamonds_${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as { diamonds?: number };
          if (typeof updated.diamonds === 'number') {
            setState(s => ({ ...s, balance: updated.diamonds as number }));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchBalance = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('users')
      .select('diamonds')
      .eq('id', userId)
      .maybeSingle();
    setState({ balance: (data as { diamonds?: number } | null)?.diamonds ?? 0, loading: false });
  };

  // Charge diamonds for Studio Mode generation
  const chargeStudio = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const hasFunds = await verifyDiamondBalance(userId, STUDIO_DIAMOND_COST);
    if (!hasFunds) {
      toast.error('Not enough Diamonds! Recharge to continue creating.', {
        description: `You need ${STUDIO_DIAMOND_COST} 💎 for this generation.`,
        duration: 5000,
      });
      return false;
    }
    const success = await updateUserDiamonds(userId, STUDIO_DIAMOND_COST, 'deduct');
    if (success) setState(s => ({ ...s, balance: s.balance - STUDIO_DIAMOND_COST }));
    return success;
  }, [userId]);

  // Charge diamonds for Radio Mode (every 30 min)
  const chargeRadio = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const hasFunds = await verifyDiamondBalance(userId, RADIO_DIAMOND_COST_30MIN);
    if (!hasFunds) {
      toast.warning('Radio stopped — Diamonds depleted!', {
        description: 'Recharge your Diamond balance to keep the music going.',
        duration: 6000,
      });
      return false;
    }
    const success = await updateUserDiamonds(userId, RADIO_DIAMOND_COST_30MIN, 'deduct');
    if (success) setState(s => ({ ...s, balance: s.balance - RADIO_DIAMOND_COST_30MIN }));
    return success;
  }, [userId]);

  return {
    balance: state.balance,
    loading: state.loading,
    chargeStudio,
    chargeRadio,
    refresh: fetchBalance,
  };
}
