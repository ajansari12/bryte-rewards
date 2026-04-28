/*
  # Rewards and Redemptions

  1. New Tables
    - `rewards` — reward catalog items per org (gift cards, experiences, etc.)
    - `redemptions` — user redemption requests

  2. Security
    - RLS on both tables
    - Rewards: readable by all org members, writable by admins
    - Redemptions: users read/create their own; managers+admins can update status
*/

CREATE TABLE IF NOT EXISTS rewards (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  title  text NOT NULL,
  brand  text NOT NULL DEFAULT '',
  denom  text NOT NULL DEFAULT '',
  points int  NOT NULL DEFAULT 0,
  color  text NOT NULL DEFAULT '#1A1A1A',
  kind   text NOT NULL DEFAULT 'giftcard',
  active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS rewards_org_id_idx ON rewards (org_id);

CREATE TABLE IF NOT EXISTS redemptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users   ON DELETE CASCADE,
  reward_id    uuid NOT NULL REFERENCES rewards  ON DELETE CASCADE,
  points_spent int  NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES users ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS redemptions_user_id_idx ON redemptions (user_id);
CREATE INDEX IF NOT EXISTS redemptions_status_idx  ON redemptions (status);

-- ─── RLS ───────────────────────────────────────────────

ALTER TABLE rewards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Rewards
CREATE POLICY "Org members can read rewards"
  ON rewards FOR SELECT TO authenticated
  USING (org_id = get_my_org_id());

CREATE POLICY "Admins can insert rewards"
  ON rewards FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update rewards"
  ON rewards FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "Admins can delete rewards"
  ON rewards FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Redemptions: users see their own
CREATE POLICY "Users can read own redemptions"
  ON redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Managers and admins can see all redemptions in their org
CREATE POLICY "Managers and admins can read all org redemptions"
  ON redemptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin')
    ) AND
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = redemptions.user_id
        AND u2.org_id = get_my_org_id()
    )
  );

CREATE POLICY "Users can create own redemptions"
  ON redemptions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM rewards r
      WHERE r.id = redemptions.reward_id
        AND r.org_id = get_my_org_id()
    )
  );

-- Managers and admins can update status
CREATE POLICY "Managers and admins can update redemption status"
  ON redemptions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin')
    ) AND
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = redemptions.user_id
        AND u2.org_id = get_my_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = redemptions.user_id
        AND u2.org_id = get_my_org_id()
    )
  );
