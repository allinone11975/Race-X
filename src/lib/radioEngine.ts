/**
 * RACE-X  ·  Live Radio Engine (Mubert API)
 * 4 moods: Focus / Relax / Energy / Midnight
 * Hard-kill on toggle-OFF to save battery + data
 * Session persistence via Supabase profile
 */
import { supabase } from '@/db/supabase';

export type RadioMood = 'Focus' | 'Relax' | 'Energy' | 'Midnight';

export interface RadioMoodConfig {
  mood: RadioMood;
  label: string;
  description: string;
  bpm_range: string;
  gradient: string;
  icon: string;
}

export const RADIO_MOODS: RadioMoodConfig[] = [
  {
    mood: 'Focus',
    label: 'Deep Focus',
    description: 'Binaural beats for flow state',
    bpm_range: '60–80 BPM',
    gradient: 'from-[#00F2FF]/30 to-[#0066FF]/10',
    icon: '🧠',
  },
  {
    mood: 'Relax',
    label: 'Relax & Chill',
    description: 'Lo-fi vibes to unwind',
    bpm_range: '70–90 BPM',
    gradient: 'from-[#BC13FE]/30 to-[#6600CC]/10',
    icon: '🌙',
  },
  {
    mood: 'Energy',
    label: 'High Energy',
    description: 'Pump-up beats for workouts',
    bpm_range: '120–140 BPM',
    gradient: 'from-[#00FF88]/30 to-[#00AA55]/10',
    icon: '⚡',
  },
  {
    mood: 'Midnight',
    label: 'Midnight Drive',
    description: 'Synthwave & dark electronic',
    bpm_range: '100–120 BPM',
    gradient: 'from-[#FF6B00]/30 to-[#CC4400]/10',
    icon: '🌃',
  },
];

// ─── Mubert Stream URLs (pre-generated channels per mood) ────────────────────
const MUBERT_STREAM_URLS: Record<RadioMood, string> = {
  Focus:    'https://stream.mubert.com/api/v2/stream?mood=focus&style=ambient&intensity=low',
  Relax:    'https://stream.mubert.com/api/v2/stream?mood=relax&style=lo-fi&intensity=low',
  Energy:   'https://stream.mubert.com/api/v2/stream?mood=energy&style=electronic&intensity=high',
  Midnight: 'https://stream.mubert.com/api/v2/stream?mood=dark&style=synthwave&intensity=medium',
};

// ─── Diamond cost: 1 per 30 minutes ─────────────────────────────────────────
export const RADIO_DIAMOND_COST_PER_30MIN = 1;

export interface RadioState {
  is_active: boolean;
  mood: RadioMood | null;
  session_id: string | null;
  started_at: Date | null;
  stream_url: string | null;
  minutes_elapsed: number;
  diamonds_spent: number;
}

// Singleton audio element for hard-kill capability
let _audioEl: HTMLAudioElement | null = null;
let _chargeInterval: ReturnType<typeof setInterval> | null = null;

// ─── Start Radio ─────────────────────────────────────────────────────────────
export async function startRadio(
  userId: string,
  mood: RadioMood,
  onDiamondCharge: (cost: number) => Promise<boolean>, // returns false if balance empty
  onAutoStop: () => void,
): Promise<{ session_id: string; stream_url: string } | null> {
  // Create DB session
  const streamUrl = MUBERT_STREAM_URLS[mood];
  const { data, error } = await supabase
    .from('radio_sessions')
    .insert({ user_id: userId, mood, is_active: true, stream_url: streamUrl })
    .select('id')
    .maybeSingle();

  if (error || !data) return null;

  // Start HTML5 Audio streaming
  _audioEl = new Audio(streamUrl);
  _audioEl.loop = true;
  _audioEl.volume = 0.85;
  _audioEl.play().catch(() => {
    // Autoplay blocked — user must interact first
  });

  // Diamond charge every 30 minutes
  let totalMinutes = 0;
  let totalDiamonds = 1; // first diamond already charged before this interval starts
  _chargeInterval = setInterval(async () => {
    const hasFunds = await onDiamondCharge(RADIO_DIAMOND_COST_PER_30MIN);
    if (!hasFunds) {
      stopRadio(userId, data.id);
      onAutoStop();
    } else {
      totalMinutes += 30;
      totalDiamonds += RADIO_DIAMOND_COST_PER_30MIN;
      // Update session billing counters
      await supabase
        .from('radio_sessions')
        .update({
          last_charged_at: new Date().toISOString(),
          total_minutes: totalMinutes,
          total_diamonds_spent: totalDiamonds,
        })
        .eq('id', data.id);
    }
  }, 30 * 60 * 1000); // 30 minutes

  return { session_id: data.id, stream_url: streamUrl };
}

// ─── Stop Radio (Hard Kill) ──────────────────────────────────────────────────
export async function stopRadio(userId: string, sessionId: string): Promise<void> {
  // Hard kill audio — no fadeout, immediate stop for battery saving
  if (_audioEl) {
    _audioEl.pause();
    _audioEl.src = '';
    _audioEl = null;
  }
  if (_chargeInterval) {
    clearInterval(_chargeInterval);
    _chargeInterval = null;
  }

  // Close DB session
  await supabase
    .from('radio_sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId);
}

// ─── Restore session on page load ────────────────────────────────────────────
export async function getActiveRadioSession(userId: string) {
  const { data } = await supabase
    .from('radio_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// ─── Volume control ──────────────────────────────────────────────────────────
export function setRadioVolume(vol: number) {
  if (_audioEl) _audioEl.volume = Math.max(0, Math.min(1, vol));
}
