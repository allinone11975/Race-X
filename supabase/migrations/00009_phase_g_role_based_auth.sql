
-- ============================================================
-- RACE-X Phase G: Role-Based Access Control
-- ============================================================

-- 1. Add role column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'moderator', 'admin', 'super_admin'));

-- 2. Backfill: existing admins (is_admin=true) get 'super_admin' role
UPDATE users SET role = 'super_admin' WHERE is_admin = true;

-- 3. Create index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 4. RLS helper: check if current user has admin role
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- 5. RLS helper: check if current user has super_admin role
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
$$;

-- 6. Secure function: get current user role (callable from frontend safely)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM users WHERE id = auth.uid()),
    'user'
  );
$$;

-- 7. Update feature_registry + admin tables to use new helper
-- (existing policies already reference is_admin column on users — keep both for backward compat)

-- 8. Expose role via a secure view (no direct table exposure)
CREATE OR REPLACE VIEW my_profile AS
  SELECT
    id,
    username,
    phone_number,
    avatar_url,
    diamonds,
    rx_points,
    user_level AS level,
    is_admin,
    role,
    created_at,
    updated_at
  FROM users
  WHERE id = auth.uid();

-- Grant access to authenticated users
GRANT SELECT ON my_profile TO authenticated;
