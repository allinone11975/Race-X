
CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  address TEXT,
  id_type TEXT,
  id_number TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  review_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image','music','character','template','preset','video')),
  title TEXT NOT NULL,
  description TEXT,
  price_diamonds INTEGER NOT NULL DEFAULT 10,
  asset_url TEXT,
  thumbnail_url TEXT,
  tags TEXT[],
  sales_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE creator_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_views BIGINT NOT NULL DEFAULT 0,
  total_likes BIGINT NOT NULL DEFAULT 0,
  total_comments BIGINT NOT NULL DEFAULT 0,
  total_shares BIGINT NOT NULL DEFAULT 0,
  total_earnings_diamonds BIGINT NOT NULL DEFAULT 0,
  ranking_score BIGINT NOT NULL DEFAULT 0,
  ranking_badge TEXT NOT NULL DEFAULT 'Bronze' CHECK (ranking_badge IN ('Bronze','Silver','Gold','Platinum','Diamond')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE vault_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  folder_path TEXT NOT NULL DEFAULT '/',
  cloudinary_public_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE render_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'video' CHECK (job_type IN ('video','image','audio','export')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','rendering','completed','failed')),
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  output_url TEXT,
  error_message TEXT,
  priority INTEGER NOT NULL DEFAULT 5,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE TABLE festival_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  background_color TEXT NOT NULL,
  overlay_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('ai_complete','social','system'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_status BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transaction_ledger ADD COLUMN IF NOT EXISTS transaction_category TEXT DEFAULT 'spent' CHECK (transaction_category IN ('earned','spent','gifted','received','referral'));
ALTER TABLE transaction_ledger ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES users(id);
ALTER PUBLICATION supabase_realtime ADD TABLE render_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_listings;
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own KYC" ON kyc_submissions FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Users insert own KYC" ON kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin updates KYC" ON kyc_submissions FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Public marketplace read" ON marketplace_listings FOR SELECT USING (is_active = true OR auth.uid() = creator_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Creators insert listings" ON marketplace_listings FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update own listings" ON marketplace_listings FOR UPDATE USING (auth.uid() = creator_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Public creator stats read" ON creator_stats FOR SELECT USING (true);
CREATE POLICY "System insert creator stats" ON creator_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System update creator stats" ON creator_stats FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Users view own vault" ON vault_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert vault" ON vault_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vault" ON vault_files FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users view own render jobs" ON render_jobs FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Users insert render jobs" ON render_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin update render jobs" ON render_jobs FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Public themes read" ON festival_themes FOR SELECT USING (true);
CREATE POLICY "Admin manages themes" ON festival_themes FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
INSERT INTO festival_themes (theme_name, display_name, primary_color, secondary_color, background_color, overlay_type, is_active)
VALUES
  ('default', 'RX Default', '#00F2FF', '#BC13FE', '#0A0A0F', null, true),
  ('diwali', 'Diwali Festival', '#FF8C00', '#FFD700', '#1A0A00', 'diya', false),
  ('christmas', 'Christmas', '#FF0000', '#00AA00', '#0A0F0A', 'snowflake', false),
  ('eid', 'Eid Mubarak', '#00CED1', '#FFD700', '#0A0F0A', 'crescent', false),
  ('newyear', 'New Year', '#C0C0C0', '#FFD700', '#0A0A0F', 'fireworks', false),
  ('halloween', 'Halloween', '#FF6600', '#1A0A1A', '#0A0000', 'pumpkin', false);
