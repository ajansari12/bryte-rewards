/*
  # Badges, User Badges, Nominations

  1. New Tables
    - `badges` — org badge definitions (name, icon, category, criteria, seasonal flag)
    - `user_badges` — many-to-many: which users have earned which badges
    - `nominations` — peer nomination submissions for badges

  2. Security
    - RLS on all three tables
    - All tables scoped to the user's org
    - user_badges scoped via join to badges
*/

CREATE TABLE IF NOT EXISTS badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  name        text NOT NULL,
  icon        text NOT NULL DEFAULT '✦',
  category    text NOT NULL DEFAULT 'Milestones',
  criteria    text NOT NULL DEFAULT '',
  is_seasonal boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS badges_org_id_idx ON badges (org_id);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id    uuid NOT NULL REFERENCES users    ON DELETE CASCADE,
  badge_id   uuid NOT NULL REFERENCES badges   ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS nominations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  badge_id     uuid NOT NULL REFERENCES badges        ON DELETE CASCADE,
  nominator_id uuid NOT NULL REFERENCES users         ON DELETE CASCADE,
  nominee_id   uuid NOT NULL REFERENCES users         ON DELETE CASCADE,
  reason       text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nominations_org_id_idx  ON nominations (org_id);
CREATE INDEX IF NOT EXISTS nominations_status_idx  ON nominations (status);

-- ─── RLS ───────────────────────────────────────────────

ALTER TABLE badges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominations  ENABLE ROW LEVEL SECURITY;

-- Badges
CREATE POLICY "Org members can read badges"
  ON badges FOR SELECT TO authenticated
  USING (org_id = get_my_org_id());

CREATE POLICY "Admins can insert badges"
  ON badges FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update badges"
  ON badges FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "Admins can delete badges"
  ON badges FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- User badges
CREATE POLICY "Org members can read user badges"
  ON user_badges FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM badges b
      WHERE b.id = user_badges.badge_id
        AND b.org_id = get_my_org_id()
    )
  );

CREATE POLICY "Admins can award badges"
  ON user_badges FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM badges b
      WHERE b.id = user_badges.badge_id
        AND b.org_id = get_my_org_id()
    ) AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can revoke badges"
  ON user_badges FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM badges b
      WHERE b.id = user_badges.badge_id
        AND b.org_id = get_my_org_id()
    ) AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Nominations
CREATE POLICY "Org members can read nominations"
  ON nominations FOR SELECT TO authenticated
  USING (org_id = get_my_org_id());

CREATE POLICY "Users can submit nominations"
  ON nominations FOR INSERT TO authenticated
  WITH CHECK (
    org_id       = get_my_org_id() AND
    nominator_id = auth.uid()
  );

CREATE POLICY "Admins can update nomination status"
  ON nominations FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (org_id = get_my_org_id());
