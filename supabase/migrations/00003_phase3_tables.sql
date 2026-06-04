
-- =============================================
-- PHASE 3: RX Kernel Control Center Tables
-- =============================================

CREATE TABLE rx_kernel_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subsystem_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('online', 'offline', 'degraded')),
  health_score integer NOT NULL CHECK (health_score >= 0 AND health_score <= 100) DEFAULT 100,
  key_metric text,
  last_check timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rx_system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  subsystem text,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')) DEFAULT 'info',
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 3: Feature Flag Tables
-- =============================================

CREATE TABLE rx_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('AI Tools', 'Economy', 'Social', 'Studio', 'Shopping', 'Admin', 'System', 'Experimental')),
  description text,
  status boolean NOT NULL DEFAULT false,
  rollout_scope text NOT NULL CHECK (rollout_scope IN ('global', 'region', 'tier')) DEFAULT 'global',
  rollout_config jsonb DEFAULT '{}',
  beta_enabled boolean NOT NULL DEFAULT false,
  beta_percentage integer NOT NULL DEFAULT 0 CHECK (beta_percentage >= 0 AND beta_percentage <= 100),
  is_critical boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rx_flag_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES rx_feature_flags(id) ON DELETE CASCADE,
  admin_user_id uuid,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 3: Analytics & BI Tables
-- =============================================

CREATE TABLE rx_analytics_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metric_name, date)
);

CREATE TABLE rx_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 3: Moderation & Safety Tables
-- =============================================

CREATE TABLE rx_moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('post', 'image', 'video', 'reel', 'story', 'comment')),
  creator_user_id uuid,
  flag_reason text NOT NULL CHECK (flag_reason IN ('nsfw', 'violence', 'spam', 'copyright', 'user_report', 'bot')),
  confidence_score integer CHECK (confidence_score >= 0 AND confidence_score <= 100),
  reporter_user_id uuid,
  thumbnail_url text,
  content_preview text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  flagged_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

CREATE TABLE rx_moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES rx_moderation_queue(id) ON DELETE SET NULL,
  content_id text,
  action_type text NOT NULL CHECK (action_type IN ('approve', 'reject', 'warn', 'ban')),
  admin_user_id uuid NOT NULL,
  notes text,
  action_timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rx_abuse_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id text,
  reporter_user_id uuid,
  reported_user_id uuid,
  report_reason text NOT NULL CHECK (report_reason IN ('harassment', 'hate_speech', 'spam', 'impersonation', 'nsfw', 'violence', 'copyright', 'other')),
  report_description text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reported_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

-- =============================================
-- RLS Policies (admin-only for all Phase 3)
-- =============================================

ALTER TABLE rx_kernel_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE rx_system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rx_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE rx_flag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rx_analytics_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE rx_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rx_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE rx_moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rx_abuse_reports ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM users WHERE id = auth.uid() LIMIT 1),
    false
  )
$$;

-- Admin-only policies for Phase 3 tables
CREATE POLICY "admin_all_rx_kernel_health" ON rx_kernel_health FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY "admin_all_rx_system_events" ON rx_system_events FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY "admin_all_rx_feature_flags" ON rx_feature_flags FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY "admin_all_rx_flag_history" ON rx_flag_history FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY "admin_all_rx_analytics_kpis" ON rx_analytics_kpis FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY "admin_all_rx_analytics_events" ON rx_analytics_events FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY "admin_all_rx_moderation_queue" ON rx_moderation_queue FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY "admin_all_rx_moderation_actions" ON rx_moderation_actions FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY "admin_all_rx_abuse_reports" ON rx_abuse_reports FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());

-- Enable realtime for kernel events and moderation queue
ALTER PUBLICATION supabase_realtime ADD TABLE rx_system_events;
ALTER PUBLICATION supabase_realtime ADD TABLE rx_kernel_health;
ALTER PUBLICATION supabase_realtime ADD TABLE rx_moderation_queue;

-- =============================================
-- SEED: Feature Flags (initial set)
-- =============================================
INSERT INTO rx_feature_flags (flag_name, category, description, status, rollout_scope, is_critical) VALUES
  ('rx_studio_enabled', 'Studio', 'Enable/disable RX Studio module', true, 'global', true),
  ('rx_social_enabled', 'Social', 'Enable/disable RX Social module', true, 'global', false),
  ('rx_magic_chat_enabled', 'AI Tools', 'Enable/disable RX Magic Chat', true, 'global', false),
  ('rx_music_enabled', 'AI Tools', 'Enable/disable RX Music module', true, 'global', false),
  ('rx_shopping_enabled', 'Shopping', 'Enable/disable RX Shopping module', true, 'global', false),
  ('diamond_economy_enabled', 'Economy', 'Enable/disable Diamond economy', true, 'global', true),
  ('render_queue_enabled', 'Studio', 'Enable/disable Render Queue', true, 'global', true),
  ('affiliate_system_enabled', 'Economy', 'Enable/disable Affiliate system', true, 'global', false),
  ('nsfw_detection_enabled', 'System', 'Enable/disable NSFW auto-detection', true, 'global', true),
  ('beta_ai_tools_v2', 'Experimental', 'Next-gen AI tools beta rollout', false, 'tier', false),
  ('realtime_collab_enabled', 'Studio', 'Enable/disable realtime collaboration', false, 'global', false),
  ('advanced_analytics_enabled', 'Admin', 'Enable/disable advanced analytics', true, 'tier', false);

-- =============================================
-- SEED: Kernel Health (initial subsystems)
-- =============================================
INSERT INTO rx_kernel_health (subsystem_name, status, health_score, key_metric) VALUES
  ('AI Providers', 'online', 95, '9/9 providers active'),
  ('Render Queue', 'online', 88, '3 active jobs'),
  ('Agent Sessions', 'online', 100, '0 active sessions'),
  ('Diamond Economy', 'online', 100, '0 transactions today'),
  ('Affiliate System', 'online', 92, '0 clicks today'),
  ('Moderation System', 'online', 100, '0 pending items'),
  ('Feature Flags', 'online', 100, '12 active flags');

-- =============================================
-- SEED: Analytics KPIs (last 7 days)
-- =============================================
INSERT INTO rx_analytics_kpis (metric_name, metric_value, date) VALUES
  ('dau', 142, current_date - 6),
  ('dau', 158, current_date - 5),
  ('dau', 173, current_date - 4),
  ('dau', 165, current_date - 3),
  ('dau', 189, current_date - 2),
  ('dau', 201, current_date - 1),
  ('dau', 218, current_date),
  ('mau', 1240, current_date - 6),
  ('mau', 1285, current_date - 5),
  ('mau', 1310, current_date - 4),
  ('mau', 1342, current_date - 3),
  ('mau', 1378, current_date - 2),
  ('mau', 1401, current_date - 1),
  ('mau', 1450, current_date),
  ('total_renders', 34, current_date - 6),
  ('total_renders', 52, current_date - 5),
  ('total_renders', 48, current_date - 4),
  ('total_renders', 61, current_date - 3),
  ('total_renders', 79, current_date - 2),
  ('total_renders', 88, current_date - 1),
  ('total_renders', 95, current_date),
  ('diamonds_earned', 320, current_date - 6),
  ('diamonds_earned', 410, current_date - 5),
  ('diamonds_earned', 380, current_date - 4),
  ('diamonds_earned', 520, current_date - 3),
  ('diamonds_earned', 490, current_date - 2),
  ('diamonds_earned', 610, current_date - 1),
  ('diamonds_earned', 740, current_date),
  ('diamonds_spent', 180, current_date - 6),
  ('diamonds_spent', 230, current_date - 5),
  ('diamonds_spent', 210, current_date - 4),
  ('diamonds_spent', 290, current_date - 3),
  ('diamonds_spent', 310, current_date - 2),
  ('diamonds_spent', 350, current_date - 1),
  ('diamonds_spent', 420, current_date),
  ('ad_impressions', 850, current_date - 6),
  ('ad_impressions', 920, current_date - 5),
  ('ad_impressions', 870, current_date - 4),
  ('ad_impressions', 1050, current_date - 3),
  ('ad_impressions', 1120, current_date - 2),
  ('ad_impressions', 1280, current_date - 1),
  ('ad_impressions', 1350, current_date),
  ('ad_completions', 510, current_date - 6),
  ('ad_completions', 590, current_date - 5),
  ('ad_completions', 540, current_date - 4),
  ('ad_completions', 680, current_date - 3),
  ('ad_completions', 720, current_date - 2),
  ('ad_completions', 830, current_date - 1),
  ('ad_completions', 890, current_date);

-- =============================================
-- SEED: Moderation Queue (demo items)
-- =============================================
INSERT INTO rx_moderation_queue (content_id, content_type, flag_reason, confidence_score, status) VALUES
  ('post_001', 'post', 'spam', 78, 'pending'),
  ('video_042', 'video', 'nsfw', 92, 'pending'),
  ('image_117', 'image', 'violence', 65, 'pending'),
  ('post_088', 'post', 'spam', 45, 'pending'),
  ('reel_023', 'reel', 'user_report', 100, 'pending'),
  ('image_205', 'image', 'nsfw', 88, 'pending'),
  ('post_312', 'post', 'spam', 71, 'pending'),
  ('video_099', 'video', 'copyright', 95, 'pending');

INSERT INTO rx_abuse_reports (content_id, report_reason, report_description, status) VALUES
  ('post_001', 'spam', 'This post contains repetitive spam content promoting external links.', 'pending'),
  ('video_042', 'nsfw', 'This video contains inappropriate content that violates community guidelines.', 'pending'),
  ('post_150', 'harassment', 'User is targeting and harassing specific community members.', 'pending'),
  ('post_222', 'impersonation', 'This account is impersonating a verified creator.', 'pending'),
  ('reel_088', 'hate_speech', 'This reel contains hate speech targeting a minority group.', 'pending');
