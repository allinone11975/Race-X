
-- ───────────────────────────────────────────────────────────────
-- RACE-X  ·  Omni Music Ecosystem  ·  Migration
-- ───────────────────────────────────────────────────────────────

-- 1. Music Tracks (Studio Mode generations)
CREATE TABLE music_tracks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Untitled Track',
  prompt          text NOT NULL,
  provider        text NOT NULL,                    -- which of the 12 tools generated it
  audio_url       text,                             -- Supabase Storage public URL
  duration_sec    integer DEFAULT 30,
  diamond_cost    integer NOT NULL DEFAULT 5,
  is_favorite     boolean NOT NULL DEFAULT false,
  is_temp         boolean NOT NULL DEFAULT true,    -- flagged for 48hr cleanup
  is_published    boolean NOT NULL DEFAULT false,
  moderation_pass boolean NOT NULL DEFAULT false,
  generation_meta jsonb DEFAULT '{}',               -- provider response metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '48 hours'
);

-- 2. Radio Sessions (Live Radio Mode)
CREATE TABLE radio_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood            text NOT NULL CHECK (mood IN ('Focus','Relax','Energy','Midnight')),
  is_active       boolean NOT NULL DEFAULT true,
  stream_url      text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_charged_at timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  total_minutes   integer NOT NULL DEFAULT 0,
  total_diamonds_spent integer NOT NULL DEFAULT 0
);

-- 3. Music Favorites (persisted beyond 48hr)
CREATE TABLE music_favorites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id   uuid NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);

-- 4. Provider Health Table (Round-Robin state + self-healing)
CREATE TABLE music_provider_health (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name   text NOT NULL UNIQUE,
  is_available    boolean NOT NULL DEFAULT true,
  last_used_at    timestamptz,
  fail_count      integer NOT NULL DEFAULT 0,
  last_fail_at    timestamptz,
  cooldown_until  timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed all 12 providers
INSERT INTO music_provider_health (provider_name) VALUES
  ('Suno'), ('Udio'), ('MiniMax'), ('Mubert'),
  ('ElevenLabs'), ('StableAudio'), ('Soundverse'),
  ('Boomy'), ('AIVA'), ('Sonauto'), ('Soundful'), ('MubertAPI');

-- ───────────────────────────────────────────────────────────────
-- RLS Policies
-- ───────────────────────────────────────────────────────────────

ALTER TABLE music_tracks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_favorites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_provider_health  ENABLE ROW LEVEL SECURITY;

-- music_tracks: owner full access
CREATE POLICY "owner_select_tracks"  ON music_tracks FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_tracks"  ON music_tracks FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_tracks"  ON music_tracks FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "owner_delete_tracks"  ON music_tracks FOR DELETE  USING (auth.uid() = user_id);

-- radio_sessions: owner full access
CREATE POLICY "owner_select_radio"   ON radio_sessions FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_radio"   ON radio_sessions FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_radio"   ON radio_sessions FOR UPDATE  USING (auth.uid() = user_id);

-- music_favorites: owner full access
CREATE POLICY "owner_select_favs"    ON music_favorites FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_favs"    ON music_favorites FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete_favs"    ON music_favorites FOR DELETE  USING (auth.uid() = user_id);

-- provider_health: public read (for gateway round-robin), no direct write from client
CREATE POLICY "public_read_providers" ON music_provider_health FOR SELECT USING (true);

-- ───────────────────────────────────────────────────────────────
-- Realtime
-- ───────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE music_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE radio_sessions;
