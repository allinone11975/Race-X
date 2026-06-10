/**
 * RACE-X Monetization — showRewardedAd()
 * AdMob Mediation placeholder: AdMob (primary) → Meta → AppLovin rotation
 * On successful view: increments Supabase diamonds by 10 + updates Zustand store
 */
import { supabase } from '@/db/supabase';

export type AdNetwork = 'AdMob' | 'Meta Audience Network' | 'AppLovin';

export interface RewardedAdResult {
  watched: boolean;
  diamondsEarned: number;
  network: AdNetwork;
  adId: string;
  errorReason?: string;
}

const DIAMOND_REWARD_AMOUNT = 10;

const AD_NETWORKS: AdNetwork[] = ['AdMob', 'Meta Audience Network', 'AppLovin'];

let adNetworkIndex = 0;

function pickNetwork(): AdNetwork {
  const network = AD_NETWORKS[adNetworkIndex % AD_NETWORKS.length];
  adNetworkIndex++;
  return network;
}

function generateAdId(): string {
  return `rx-ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Core function ─────────────────────────────────────────────────────────────

/**
 * showRewardedAd()
 * Call this before any high-fidelity media export.
 * - Simulates ad loading + playback (10 seconds)
 * - On completion: grants 10 diamonds in Supabase + local store
 * - Returns a result object the caller can use to gate the export
 *
 * @param userId - Supabase user ID to credit diamonds to
 * @param onProgress - optional callback receiving seconds remaining (10→0)
 */
export async function showRewardedAd(
  userId: string,
  onProgress?: (secondsLeft: number, network: AdNetwork) => void
): Promise<RewardedAdResult> {
  const network = pickNetwork();
  const adId = generateAdId();

  // ── Phase 1: Ad load simulation ──────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 400)); // simulate ad network handshake

  // ── Phase 2: Countdown (10 seconds) ─────────────────────────────────────────
  const DURATION = 10;
  for (let s = DURATION; s > 0; s--) {
    onProgress?.(s, network);
    await new Promise((r) => setTimeout(r, 1000));
  }
  onProgress?.(0, network);

  // ── Phase 3: Grant diamonds in Supabase ──────────────────────────────────────
  let diamondsEarned = 0;
  try {
    // Fetch current balance
    const { data: userData } = await supabase
      .from('users')
      .select('diamonds')
      .eq('id', userId)
      .maybeSingle();

    const currentDiamonds = userData?.diamonds ?? 0;
    const newBalance = currentDiamonds + DIAMOND_REWARD_AMOUNT;

    // Update balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ diamonds: newBalance })
      .eq('id', userId);

    if (!updateError) {
      diamondsEarned = DIAMOND_REWARD_AMOUNT;

      // Log to transaction ledger
      await supabase.from('transaction_ledger').insert({
        user_id: userId,
        action_type: 'AD_REWARD_EXPORT',
        diamond_balance_before: currentDiamonds,
        diamond_balance_after: newBalance,
        transaction_category: 'earned',
        output_result: { network, adId, reward: DIAMOND_REWARD_AMOUNT },
      });

      // Log ad impression
      try {
        await supabase.from('ad_impressions').insert({
          user_id: userId,
          network,
          ad_id: adId,
          diamonds_rewarded: DIAMOND_REWARD_AMOUNT,
          ad_type: 'rewarded_export',
        });
      } catch { /* table may not exist yet */ }
    }
  } catch (err) {
    console.warn('[showRewardedAd] Supabase update failed:', err);
    // Still mark as watched even if DB update fails
    diamondsEarned = DIAMOND_REWARD_AMOUNT;
  }

  return { watched: true, diamondsEarned, network, adId };
}

// ─── Diamond check before export ──────────────────────────────────────────────

/**
 * Checks if the user has enough diamonds for a high-fidelity export.
 * If not, triggers showRewardedAd() to earn the required amount.
 */
export async function gateExportWithDiamonds(
  userId: string,
  requiredDiamonds: number,
  onAdProgress?: (secondsLeft: number, network: AdNetwork) => void
): Promise<{ canExport: boolean; diamondsAfter: number; adWatched: boolean }> {
  const { data: userData } = await supabase
    .from('users')
    .select('diamonds')
    .eq('id', userId)
    .maybeSingle();

  const current = userData?.diamonds ?? 0;

  if (current >= requiredDiamonds) {
    return { canExport: true, diamondsAfter: current, adWatched: false };
  }

  // Not enough diamonds — show rewarded ad
  const adResult = await showRewardedAd(userId, onAdProgress);
  const afterAd = current + adResult.diamondsEarned;

  return {
    canExport: afterAd >= requiredDiamonds,
    diamondsAfter: afterAd,
    adWatched: adResult.watched,
  };
}
