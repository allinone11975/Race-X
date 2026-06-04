/**
 * RACE-X  ·  Omni-Rotational API Gateway
 * 12 providers  ·  Round-Robin load balancing  ·  Self-healing fallback
 * Personal Use Only — all prompts are moderation-scanned before execution
 */
import { supabase } from '@/db/supabase';

// ─── Provider Registry ────────────────────────────────────────────────────────
export type MusicProvider =
  | 'Suno' | 'Udio' | 'MiniMax' | 'Mubert'
  | 'ElevenLabs' | 'StableAudio' | 'Soundverse'
  | 'Boomy' | 'AIVA' | 'Sonauto' | 'Soundful' | 'MubertAPI';

export const PROVIDERS: MusicProvider[] = [
  'Suno', 'Udio', 'MiniMax', 'Mubert',
  'ElevenLabs', 'StableAudio', 'Soundverse',
  'Boomy', 'AIVA', 'Sonauto', 'Soundful', 'MubertAPI',
];

// Persisted across page loads via localStorage
const GATEWAY_STATE_KEY = 'rx_gateway_rr_index';

export interface GatewayProviderStatus {
  name: MusicProvider;
  is_available: boolean;
  fail_count: number;
  last_used_at: string | null;
  cooldown_until: string | null;
}

export interface GatewayGenerateParams {
  prompt: string;
  duration_sec?: number;    // default 30
  mood?: string;
  style?: string;
  userId: string;
}

export interface GatewayGenerateResult {
  success: boolean;
  audio_url?: string;
  provider?: MusicProvider;
  track_id?: string;
  error?: string;
  diamond_cost: number;
}

// ─── Round-Robin Cursor ───────────────────────────────────────────────────────
function getNextIndex(total: number): number {
  const current = parseInt(localStorage.getItem(GATEWAY_STATE_KEY) ?? '0', 10);
  const next = (current + 1) % total;
  localStorage.setItem(GATEWAY_STATE_KEY, String(next));
  return next;
}

// ─── Provider Health (from DB) ───────────────────────────────────────────────
export async function fetchProviderStatuses(): Promise<GatewayProviderStatus[]> {
  const { data } = await supabase
    .from('music_provider_health')
    .select('provider_name,is_available,fail_count,last_used_at,cooldown_until')
    .order('provider_name');
  if (!Array.isArray(data)) return PROVIDERS.map(name => ({ name, is_available: true, fail_count: 0, last_used_at: null, cooldown_until: null }));
  return data.map((row: Record<string, unknown>) => ({
    name: row.provider_name as MusicProvider,
    is_available: Boolean(row.is_available),
    fail_count: Number(row.fail_count ?? 0),
    last_used_at: (row.last_used_at as string) ?? null,
    cooldown_until: (row.cooldown_until as string) ?? null,
  }));
}

// ─── Self-Healing: mark provider failure ─────────────────────────────────────
async function markProviderFailed(provider: MusicProvider) {
  const cooldown = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min cooldown
  // Fetch current fail_count first, then increment
  const { data: current } = await supabase
    .from('music_provider_health')
    .select('fail_count')
    .eq('provider_name', provider)
    .maybeSingle();
  const newFailCount = ((current as { fail_count?: number } | null)?.fail_count ?? 0) + 1;
  await supabase
    .from('music_provider_health')
    .update({
      is_available: false,
      fail_count: newFailCount,
      last_fail_at: new Date().toISOString(),
      cooldown_until: cooldown,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_name', provider);
}

async function markProviderUsed(provider: MusicProvider) {
  await supabase
    .from('music_provider_health')
    .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('provider_name', provider);
}

// ─── Select next AVAILABLE provider (Round-Robin + skip unavailable) ─────────
async function selectProvider(): Promise<MusicProvider | null> {
  const statuses = await fetchProviderStatuses();
  const available = statuses.filter(s => {
    if (!s.is_available) return false;
    if (s.cooldown_until && new Date(s.cooldown_until) > new Date()) return false;
    return true;
  });
  if (available.length === 0) return null;
  const idx = getNextIndex(available.length);
  return available[idx % available.length].name;
}

// ─── Core Generate (routed via Supabase Edge Function) ───────────────────────
export async function generateTrack(params: GatewayGenerateParams): Promise<GatewayGenerateResult> {
  const DIAMOND_COST = 5;
  const duration = params.duration_sec ?? 30;

  // Pick provider
  const provider = await selectProvider();
  if (!provider) return { success: false, error: 'All providers temporarily unavailable. Please retry in 30 minutes.', diamond_cost: 0 };

  await markProviderUsed(provider);

  // Call Edge Function (routes to active provider)
  const { data, error } = await supabase.functions.invoke('music-generate', {
    body: {
      prompt: params.prompt,
      provider,
      duration_sec: duration,
      mood: params.mood,
      style: params.style,
      userId: params.userId,
    },
  });

  if (error || !data?.success) {
    await markProviderFailed(provider);
    // Self-heal: retry once with next provider
    const fallbackProvider = await selectProvider();
    if (!fallbackProvider || fallbackProvider === provider) {
      return { success: false, error: `${provider} failed. All providers exhausted.`, diamond_cost: 0 };
    }
    const { data: d2, error: e2 } = await supabase.functions.invoke('music-generate', {
      body: { prompt: params.prompt, provider: fallbackProvider, duration_sec: duration, mood: params.mood, style: params.style, userId: params.userId },
    });
    if (e2 || !d2?.success) {
      await markProviderFailed(fallbackProvider);
      return { success: false, error: 'Generation failed after self-heal retry.', diamond_cost: 0 };
    }
    return {
      success: true,
      audio_url: d2.audio_url,
      provider: fallbackProvider,
      track_id: d2.track_id,
      diamond_cost: DIAMOND_COST,
    };
  }

  return {
    success: true,
    audio_url: data.audio_url,
    provider,
    track_id: data.track_id,
    diamond_cost: DIAMOND_COST,
  };
}
