
-- ============================================================
-- RACE-X Phase F: Unified Gateway + Economy + Registry Tables
-- ============================================================

-- 1. FEATURE REGISTRY — Central truth for all tools, providers, models, workflows
CREATE TABLE IF NOT EXISTS feature_registry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_type   text NOT NULL CHECK (registry_type IN ('tool','provider','model','workflow')),
  name            text NOT NULL,
  display_name    text NOT NULL,
  description     text,
  module          text NOT NULL,
  version         text NOT NULL DEFAULT '1.0.0',
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','deprecated','beta','disabled')),
  config          jsonb NOT NULL DEFAULT '{}',
  capabilities    text[] DEFAULT '{}',
  cost_per_call   numeric(10,6) DEFAULT 0,
  rate_limit_rpm  int DEFAULT 60,
  priority        int DEFAULT 5,
  fallback_to     text,
  health_endpoint text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(registry_type, name)
);
ALTER TABLE feature_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registry_admin_all"  ON feature_registry FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "registry_users_read" ON feature_registry FOR SELECT TO authenticated USING (
  status IN ('active','beta')
);
ALTER PUBLICATION supabase_realtime ADD TABLE feature_registry;

-- Seed registry with known tools and providers
INSERT INTO feature_registry (registry_type, name, display_name, description, module, config, capabilities, cost_per_call, rate_limit_rpm, priority, fallback_to)
VALUES
  -- TOOLS
  ('tool','rx_studio',     'RX Studio',      'AI creative studio — images, video, voice', 'studio',  '{"flag":"studio_mode"}',   ARRAY['image','video','voice'],    0,     100, 1, null),
  ('tool','rx_music',      'RX Music',       'AI music generation + radio',               'music',   '{"flag":"music_studio"}',  ARRAY['music','audio'],            0,     100, 2, null),
  ('tool','rx_social',     'RX Social',      'Social feed, stories, reactions',           'social',  '{"flag":"social_feed"}',   ARRAY['feed','stories','chat'],    0,     200, 3, null),
  ('tool','rx_chat',       'RX Magic Chat',  'AI chat with memory',                       'chat',    '{"flag":"rx_magic_chat"}', ARRAY['chat','memory'],            0,     100, 4, null),
  ('tool','rx_shopping',   'RX Shopping',    'Creator marketplace',                       'shopping','{"flag":"rx_shopping"}',   ARRAY['marketplace','payments'],   0,     100, 5, null),
  -- PROVIDERS — Music
  ('provider','suno',           'Suno AI',           'High-quality music generation',     'music',  '{"tier":"premium"}', ARRAY['music'],       0.010000, 60,  1, 'udio'),
  ('provider','udio',           'Udio',              'Music from text prompts',           'music',  '{"tier":"premium"}', ARRAY['music'],       0.008000, 60,  2, 'mubert'),
  ('provider','mubert',         'Mubert',            'Royalty-free AI music streams',     'music',  '{"tier":"free"}',    ARRAY['music','radio'],0.001000, 120, 3, 'boomy'),
  ('provider','boomy',          'Boomy',             'Fast music generation',             'music',  '{"tier":"free"}',    ARRAY['music'],       0.002000, 60,  4, 'sonauto'),
  ('provider','sonauto',        'Sonauto',           'Text-to-music AI',                  'music',  '{"tier":"free"}',    ARRAY['music'],       0.001000, 60,  5, 'soundful'),
  ('provider','soundful',       'Soundful',          'AI background music',               'music',  '{"tier":"free"}',    ARRAY['music'],       0.001500, 60,  6, 'aiva'),
  ('provider','aiva',           'AIVA',              'Emotional AI music composer',       'music',  '{"tier":"premium"}', ARRAY['music'],       0.005000, 30,  7, 'beatoven'),
  ('provider','beatoven',       'Beatoven',          'Mood-based music generation',       'music',  '{"tier":"free"}',    ARRAY['music'],       0.002000, 60,  8, 'minimax'),
  ('provider','minimax',        'MiniMax',           'Fast AI music generation',          'music',  '{"tier":"premium"}', ARRAY['music'],       0.006000, 60,  9, 'elevenlabs'),
  ('provider','elevenlabs',     'ElevenLabs',        'Voice + music AI',                  'music',  '{"tier":"premium"}', ARRAY['music','voice'],0.012000, 60,  10,'stable_audio'),
  ('provider','stable_audio',   'Stable Audio',      'Stability AI music',                'music',  '{"tier":"premium"}', ARRAY['music'],       0.008000, 60,  11,'soundverse'),
  ('provider','soundverse',     'Soundverse',        'Generative music AI',               'music',  '{"tier":"free"}',    ARRAY['music'],       0.002000, 60,  12, null),
  -- PROVIDERS — Image
  ('provider','flux_schnell',   'FLUX Schnell',      'Ultra-fast image generation',       'studio', '{"tier":"free"}',    ARRAY['image'],       0.000100, 100, 1, 'stable_diffusion'),
  ('provider','stable_diffusion','Stable Diffusion', 'Open-source image AI',             'studio', '{"tier":"free"}',    ARRAY['image'],       0.000200, 60,  2, 'dalle3'),
  ('provider','dalle3',         'DALL-E 3',          'OpenAI image generation',           'studio', '{"tier":"premium"}', ARRAY['image'],       0.040000, 30,  3, 'flux_schnell'),
  ('provider','midjourney',     'Midjourney',        'Artistic image generation',         'studio', '{"tier":"premium"}', ARRAY['image'],       0.050000, 20,  4, 'dalle3'),
  -- PROVIDERS — Chat
  ('provider','groq_llama',     'Groq LLaMA 3.3',    'Ultra-fast chat inference',         'chat',   '{"tier":"free"}',    ARRAY['chat','reasoning'], 0.000001, 500, 1, 'groq_mixtral'),
  ('provider','groq_mixtral',   'Groq Mixtral',      'Balanced speed/quality',            'chat',   '{"tier":"free"}',    ARRAY['chat'],        0.000001, 500, 2, 'gemini_flash'),
  ('provider','gemini_flash',   'Gemini 2.0 Flash',  'Google multimodal AI',              'chat',   '{"tier":"premium"}', ARRAY['chat','vision'],0.000100, 100, 3, 'groq_llama'),
  -- MODELS
  ('model','musicgen_small',    'MusicGen Small',    'Fast music, lower quality',         'music',  '{"params":"300M"}',  ARRAY['music'],       0.000100, 120, 1, 'musicgen_large'),
  ('model','musicgen_large',    'MusicGen Large',    'High-quality music generation',     'music',  '{"params":"3.3B"}',  ARRAY['music'],       0.001000, 30,  2, 'musicgen_small'),
  ('model','llama_70b',         'LLaMA 3.3 70B',     'Large language model',              'chat',   '{"params":"70B"}',   ARRAY['chat'],        0.000001, 500, 1, 'llama_8b'),
  ('model','llama_8b',          'LLaMA 3.1 8B',      'Fast lightweight model',            'chat',   '{"params":"8B"}',    ARRAY['chat'],        0.000000, 500, 2, null)
ON CONFLICT (registry_type, name) DO NOTHING;

-- 2. DIAMOND TRANSACTIONS — Atomic ledger, prevent double-spend
CREATE TABLE IF NOT EXISTS diamond_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tx_type         text NOT NULL CHECK (tx_type IN ('earn','spend','reward','gift','refund','admin_grant','admin_deduct','referral','ad_watch')),
  amount          int NOT NULL,
  balance_before  int NOT NULL,
  balance_after   int NOT NULL,
  tool            text,
  description     text NOT NULL,
  reference_id    uuid,
  idempotency_key text UNIQUE,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diamond_tx_user   ON diamond_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diamond_tx_type   ON diamond_transactions(tx_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diamond_idem      ON diamond_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE diamond_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diamond_tx_own"   ON diamond_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "diamond_tx_admin" ON diamond_transactions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);
ALTER PUBLICATION supabase_realtime ADD TABLE diamond_transactions;

-- Atomic diamond spend function — prevents double-spending
CREATE OR REPLACE FUNCTION spend_diamonds(
  p_user_id       uuid,
  p_amount        int,
  p_tool          text,
  p_description   text,
  p_idempotency   text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance      int;
  v_balance_after int;
  v_tx_id        uuid;
BEGIN
  -- Idempotency check
  IF p_idempotency IS NOT NULL THEN
    SELECT id INTO v_tx_id FROM diamond_transactions WHERE idempotency_key = p_idempotency;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'idempotent', true, 'tx_id', v_tx_id);
    END IF;
  END IF;

  -- Lock user row
  SELECT diamonds INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  -- Sufficient balance check
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_diamonds', 'balance', v_balance);
  END IF;

  v_balance_after := v_balance - p_amount;

  -- Deduct
  UPDATE users SET diamonds = v_balance_after WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO diamond_transactions (user_id, tx_type, amount, balance_before, balance_after, tool, description, idempotency_key)
  VALUES (p_user_id, 'spend', p_amount, v_balance, v_balance_after, p_tool, p_description, p_idempotency)
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('success', true, 'tx_id', v_tx_id, 'balance_after', v_balance_after);
END;
$$;

-- Atomic diamond earn function
CREATE OR REPLACE FUNCTION earn_diamonds(
  p_user_id     uuid,
  p_amount      int,
  p_tx_type     text,
  p_description text,
  p_idempotency text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance      int;
  v_balance_after int;
  v_tx_id        uuid;
BEGIN
  IF p_idempotency IS NOT NULL THEN
    SELECT id INTO v_tx_id FROM diamond_transactions WHERE idempotency_key = p_idempotency;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'idempotent', true, 'tx_id', v_tx_id);
    END IF;
  END IF;

  SELECT diamonds INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  v_balance_after := v_balance + p_amount;
  UPDATE users SET diamonds = v_balance_after WHERE id = p_user_id;

  INSERT INTO diamond_transactions (user_id, tx_type, amount, balance_before, balance_after, description, idempotency_key)
  VALUES (p_user_id, p_tx_type, p_amount, v_balance, v_balance_after, p_description, p_idempotency)
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('success', true, 'tx_id', v_tx_id, 'balance_after', v_balance_after);
END;
$$;

-- 3. ASSET BACKUPS — Disaster recovery metadata registry
CREATE TABLE IF NOT EXISTS asset_backups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id),
  asset_type      text NOT NULL CHECK (asset_type IN ('image','video','audio','project','profile','voice')),
  original_url    text NOT NULL,
  backup_url      text,
  cloudinary_id   text,
  file_size_bytes bigint,
  is_verified     boolean NOT NULL DEFAULT false,
  is_deleted      boolean NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  retention_days  int NOT NULL DEFAULT 90,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asset_backups_user ON asset_backups(user_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_backups_del  ON asset_backups(is_deleted, retention_days);
ALTER TABLE asset_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_backups_own"   ON asset_backups FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "asset_backups_admin" ON asset_backups FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- 4. AI GATEWAY CACHE — Prevent duplicate generation calls
CREATE TABLE IF NOT EXISTS ai_gateway_cache (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key       text UNIQUE NOT NULL,
  tool            text NOT NULL,
  provider        text NOT NULL,
  prompt_hash     text NOT NULL,
  result_url      text NOT NULL,
  cloudinary_id   text,
  hit_count       int NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
CREATE INDEX IF NOT EXISTS idx_cache_key     ON ai_gateway_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON ai_gateway_cache(expires_at);
ALTER TABLE ai_gateway_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cache_read" ON ai_gateway_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "cache_admin" ON ai_gateway_cache FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- 5. Realtime for user table (ensure sync)
ALTER PUBLICATION supabase_realtime ADD TABLE users;
