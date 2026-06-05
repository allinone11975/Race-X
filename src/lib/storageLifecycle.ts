/**
 * RACE-X  ·  Storage Lifecycle Manager
 * Auto-deletes temp music files after 48 hours
 * Preserves only 'Favorited' tracks indefinitely
 * Runs on page load + every 6 hours in-session
 */
import { supabase } from '@/db/supabase';

export interface CleanupReport {
  deleted_count: number;
  preserved_count: number;
  freed_bytes: number;
  run_at: string;
}

// ─── Run 48hr Cleanup ────────────────────────────────────────────────────────
export async function runStorageCleanup(userId: string): Promise<CleanupReport> {
  const now = new Date().toISOString();

  // 1. Find expired temp tracks (not favorited)
  const { data: expiredTracks } = await supabase
    .from('music_tracks')
    .select('id, audio_url, is_favorite')
    .eq('user_id', userId)
    .eq('is_temp', true)
    .eq('is_favorite', false)
    .lt('expires_at', now)
    .order('created_at', { ascending: true })
    .limit(100);

  if (!Array.isArray(expiredTracks) || expiredTracks.length === 0) {
    return { deleted_count: 0, preserved_count: 0, freed_bytes: 0, run_at: now };
  }

  const ids = expiredTracks.map(t => t.id as string);

  // 2. Delete from Supabase Storage
  const storagePaths = expiredTracks
    .filter(t => t.audio_url && typeof t.audio_url === 'string' && t.audio_url.includes('music-tracks/'))
    .map(t => {
      const url = t.audio_url as string;
      const pathStart = url.indexOf('music-tracks/');
      return url.slice(pathStart);
    });

  if (storagePaths.length > 0) {
    await supabase.storage.from('music-tracks').remove(storagePaths);
  }

  // 3. Delete DB records
  await supabase.from('music_tracks').delete().in('id', ids);

  // Count preserved (favorited still-alive)
  const { count: preserved } = await supabase
    .from('music_tracks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_favorite', true);

  return {
    deleted_count: expiredTracks.length,
    preserved_count: preserved ?? 0,
    freed_bytes: expiredTracks.length * 1_500_000, // estimate ~1.5MB/30s clip
    run_at: now,
  };
}

// ─── Favorite a track (removes temp flag + extends lifetime) ─────────────────
export async function favoriteTrack(userId: string, trackId: string): Promise<boolean> {
  const { error: favError } = await supabase
    .from('music_favorites')
    .insert({ user_id: userId, track_id: trackId });
  if (favError && favError.code !== '23505') return false; // ignore duplicate

  const { error: updateError } = await supabase
    .from('music_tracks')
    .update({ is_favorite: true, is_temp: false, expires_at: '2099-12-31T00:00:00Z' })
    .eq('id', trackId)
    .eq('user_id', userId);

  return !updateError;
}

// ─── Unfavorite (restore 48hr clock from now) ────────────────────────────────
export async function unfavoriteTrack(userId: string, trackId: string): Promise<boolean> {
  await supabase
    .from('music_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('track_id', trackId);

  const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('music_tracks')
    .update({ is_favorite: false, is_temp: true, expires_at: newExpiry })
    .eq('id', trackId)
    .eq('user_id', userId);

  return !error;
}

// ─── Schedule: call on mount + every 6 hours ─────────────────────────────────
export function scheduleCleanup(userId: string) {
  runStorageCleanup(userId); // immediate on mount
  const interval = setInterval(() => runStorageCleanup(userId), 6 * 60 * 60 * 1000);
  return () => clearInterval(interval);
}
