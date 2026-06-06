
-- Allow authenticated users to insert their own row (required for new sign-ups)
CREATE POLICY "Users can insert own row"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow anon to insert (needed during signUp before session is fully established)
CREATE POLICY "Anon can insert own row on signup"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow select for authenticated (needed for role lookups during login)
-- existing "Users are viewable by everyone" already covers this
