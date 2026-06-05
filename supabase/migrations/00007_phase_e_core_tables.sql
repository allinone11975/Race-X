
-- ============================================================
-- RACE-X Phase E: Master Architecture Core Tables
-- ============================================================

-- 1. SYSTEM CONFIG (global kill-switch + platform settings)
CREATE TABLE IF NOT EXISTS system_config (
  key   text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO system_config (key, value) VALUES
  ('global_kill_switch', '{"active": false, "reason": "", "activated_by": null, "activated_at": null}'),
  ('platform_mode',      '{"mode": "live", "maintenance_message": "", "maintenance_end": null}'),
  ('zero_cost_mode',     '{"enabled": false, "cache_first": true, "prefer_free_tier": true}'),
  ('pwa_config',         '{"app_name": "RACE-X", "short_name": "RX", "theme_color": "#BC13FE", "bg_color": "#0A0A0F", "install_enabled": true}')
ON CONFLICT (key) DO NOTHING;

-- 2. ADMIN AUDIT LOG
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      uuid REFERENCES auth.users(id),
  admin_name    text,
  action_type   text NOT NULL,
  target_type   text,
  target_id     text,
  payload       jsonb DEFAULT '{}',
  ip_address    text,
  user_agent    text,
  severity      text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action  ON admin_audit_log(action_type);
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_audit_select" ON admin_audit_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "admin_audit_insert" ON admin_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- 3. PLATFORM NOTIFICATIONS
CREATE TABLE IF NOT EXISTS platform_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  body            text NOT NULL,
  type            text NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','error','success','promo','maintenance')),
  target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all','premium','free','admin')),
  is_active       boolean NOT NULL DEFAULT true,
  is_pinned       boolean NOT NULL DEFAULT false,
  cta_label       text,
  cta_url         text,
  expires_at      timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_admin_all" ON platform_notifications FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "notif_users_read" ON platform_notifications FOR SELECT TO authenticated USING (
  is_active = true AND (expires_at IS NULL OR expires_at > now())
);

-- 4. QUEUE JOBS (background processing)
CREATE TABLE IF NOT EXISTS queue_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id),
  job_type        text NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  priority        int NOT NULL DEFAULT 5,
  payload         jsonb NOT NULL DEFAULT '{}',
  result          jsonb,
  error_message   text,
  progress        int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  attempts        int NOT NULL DEFAULT 0,
  max_attempts    int NOT NULL DEFAULT 3,
  worker_id       text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status   ON queue_jobs(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_user     ON queue_jobs(user_id, status);
ALTER TABLE queue_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_user_own" ON queue_jobs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "queue_admin_all" ON queue_jobs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);
ALTER PUBLICATION supabase_realtime ADD TABLE queue_jobs;

-- 5. COST BUDGETS (provider spend tracking)
CREATE TABLE IF NOT EXISTS cost_budgets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name   text NOT NULL,
  budget_type     text NOT NULL CHECK (budget_type IN ('daily','weekly','monthly')),
  limit_usd       numeric(10,4) NOT NULL DEFAULT 0,
  spent_usd       numeric(10,4) NOT NULL DEFAULT 0,
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  alert_threshold numeric(3,2) NOT NULL DEFAULT 0.80,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_name, budget_type, period_start)
);
ALTER TABLE cost_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_budgets_admin" ON cost_budgets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- 6. PROVIDER COST TRACKING (per-call cost log)
CREATE TABLE IF NOT EXISTS provider_cost_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name   text NOT NULL,
  model_name      text,
  tool_type       text NOT NULL,
  cost_usd        numeric(10,6) NOT NULL DEFAULT 0,
  tokens_used     int,
  duration_ms     int,
  success         boolean NOT NULL DEFAULT true,
  user_id         uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_provider_cost_provider ON provider_cost_log(provider_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_cost_date     ON provider_cost_log(created_at DESC);
ALTER TABLE provider_cost_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_log_admin" ON provider_cost_log FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- 7. ENHANCED FEATURE FLAGS (v2 — full directive spec)
CREATE TABLE IF NOT EXISTS rx_feature_flags_v2 (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name       text UNIQUE NOT NULL,
  display_name    text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'general',
  is_enabled      boolean NOT NULL DEFAULT true,
  is_premium      boolean NOT NULL DEFAULT false,
  diamond_cost    int NOT NULL DEFAULT 0,
  region_lock     text[] DEFAULT '{}',
  min_level       int NOT NULL DEFAULT 0,
  is_beta         boolean NOT NULL DEFAULT false,
  is_critical     boolean NOT NULL DEFAULT false,
  rollout_percent int NOT NULL DEFAULT 100 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES auth.users(id)
);
ALTER TABLE rx_feature_flags_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_v2_admin_all" ON rx_feature_flags_v2 FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "flags_v2_users_read" ON rx_feature_flags_v2 FOR SELECT TO authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE rx_feature_flags_v2;

-- Insert default feature flags
INSERT INTO rx_feature_flags_v2 (flag_name, display_name, description, category, is_enabled, is_premium, diamond_cost, min_level, is_beta, is_critical)
VALUES
  ('studio_mode',       'RX Studio',          'AI creative studio — image, video, voice', 'studio',  true,  false, 0,  0, false, true),
  ('music_studio',      'Music Studio',        '12-provider AI music generation',          'music',   true,  false, 5,  0, false, true),
  ('live_radio',        'Live Radio',          'Omni radio with 4 moods',                  'music',   true,  false, 1,  0, false, false),
  ('ai_images',         'AI Images',           'Text-to-image generation',                 'studio',  true,  false, 3,  0, false, false),
  ('ai_video',          'AI Video',            'Text/image-to-video generation',           'studio',  true,  true,  10, 2, true,  false),
  ('ai_tools',          'AI Tools',            'Writer, translator, summarizer',           'studio',  true,  false, 0,  0, false, false),
  ('social_feed',       'Social Feed',         'RX Social — posts, stories, reactions',   'social',  true,  false, 0,  0, false, false),
  ('rx_shopping',       'RX Shopping',         'Creator marketplace',                      'shopping',true,  false, 0,  0, true,  false),
  ('rx_magic_chat',     'RX Magic Chat',       'AI conversation with memory',              'chat',    true,  false, 0,  0, false, false),
  ('diamond_rewards',   'Diamond Rewards',     'Ad-watch + task reward system',            'economy', true,  false, 0,  0, false, true),
  ('kyc_verification',  'KYC Verification',    'Identity verification for payouts',        'security',true,  false, 0,  0, false, true),
  ('voice_clone',       'Voice Clone',         'Clone and use custom AI voice',            'studio',  false, true,  25, 5, true,  false)
ON CONFLICT (flag_name) DO NOTHING;

-- 8. FRAUD / ABUSE LOG
CREATE TABLE IF NOT EXISTS fraud_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id),
  event_type    text NOT NULL,
  severity      text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  details       jsonb DEFAULT '{}',
  ip_address    text,
  auto_action   text,
  resolved      boolean NOT NULL DEFAULT false,
  reviewed_by   uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fraud_user     ON fraud_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_resolved ON fraud_events(resolved, severity);
ALTER TABLE fraud_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud_admin_all" ON fraud_events FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- 9. AI MEMORY LAYER
CREATE TABLE IF NOT EXISTS ai_memory (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type   text NOT NULL CHECK (memory_type IN ('prompt','style','voice','character','project','preference')),
  name          text NOT NULL,
  data          jsonb NOT NULL DEFAULT '{}',
  tags          text[] DEFAULT '{}',
  is_pinned     boolean NOT NULL DEFAULT false,
  tool_context  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON ai_memory(user_id, memory_type);
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_memory_own" ON ai_memory FOR ALL TO authenticated USING (user_id = auth.uid());

-- 10. PROVIDER HEALTH SNAPSHOTS (time-series for health monitor)
CREATE TABLE IF NOT EXISTS provider_health_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name   text NOT NULL,
  status          text NOT NULL CHECK (status IN ('online','degraded','offline')),
  latency_ms      int,
  success_rate    numeric(5,2),
  error_count     int DEFAULT 0,
  checked_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_provider ON provider_health_log(provider_name, checked_at DESC);
ALTER TABLE provider_health_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_log_admin" ON provider_health_log FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- 11. ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS analytics_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id),
  event_name    text NOT NULL,
  module        text NOT NULL,
  properties    jsonb DEFAULT '{}',
  session_id    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_event  ON analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_module ON analytics_events(module, created_at DESC);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_admin" ON analytics_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "analytics_insert" ON analytics_events FOR INSERT TO authenticated WITH CHECK (true);
