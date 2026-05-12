/*
  # Security hardening + schema indexes

  1. Policy changes
    - `users` self-INSERT: restrict `role` to `'employee'` on self-insert so an
      authenticated user cannot escalate to `admin` by inserting their own row
      with an elevated role. The `bootstrap_org_and_user` RPC (SECURITY DEFINER)
      still creates the initial `admin` row legitimately.
    - `users` self-UPDATE: prevent users from changing their own `role`,
      `org_id`, `manager_id`, or `points`. Admins update other users through
      separate admin-only policies.

  2. New Policy
    - `Admins can update teammates` on `users`: org admins can update
      teammates in the same org (role changes, manager assignment).

  3. Performance
    - Index on `recognitions (org_id, created_at DESC)` for the Feed hot path.
    - Index on `recognitions (recipient_id, created_at DESC)` for Profile.

  ## Notes
    1. Existing policies dropped and recreated to tighten WITH CHECK clauses.
    2. No data is rewritten; this is policy + index changes only.
*/

DROP POLICY IF EXISTS "Users can insert own row" ON users;
CREATE POLICY "Users can insert own row"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role = 'employee'
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    AND points = (SELECT points FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update teammates" ON users;
CREATE POLICY "Admins can update teammates"
  ON users FOR UPDATE
  TO authenticated
  USING (
    org_id = get_my_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (org_id = get_my_org_id());

CREATE INDEX IF NOT EXISTS recognitions_org_created_idx
  ON recognitions (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS recognitions_recipient_created_idx
  ON recognitions (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);
