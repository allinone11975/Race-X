-- App configurations table for global settings
CREATE TABLE app_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Frontend code files storage
CREATE TABLE frontend_code_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_path TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL,
  last_updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for app_configurations
ALTER TABLE app_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "App configurations are viewable by everyone" ON app_configurations FOR SELECT USING (true);
CREATE POLICY "Only admins can manage app configurations" ON app_configurations FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = TRUE)
);

-- RLS for frontend_code_files
ALTER TABLE frontend_code_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Frontend code files are viewable by everyone" ON frontend_code_files FOR SELECT USING (true);
CREATE POLICY "Only admins can manage frontend code files" ON frontend_code_files FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = TRUE)
);

-- Insert default background color
INSERT INTO app_configurations (config_key, config_value)
VALUES ('background_color', '{"color": "#000000", "type": "solid"}')
ON CONFLICT (config_key) DO NOTHING;
