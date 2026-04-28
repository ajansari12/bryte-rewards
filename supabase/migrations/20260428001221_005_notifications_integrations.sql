/*
  # Notifications and Integrations

  1. New Tables
    - `notifications` — per-user notification inbox with typed payloads
    - `integrations` — org-level third-party connections (composite PK)

  2. Security
    - RLS on both tables
    - Notifications: users read/update only their own rows
    - Integrations: readable by org members, writable by admins
*/

CREATE TABLE IF NOT EXISTS notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  kind         text NOT NULL DEFAULT 'recognition',
  payload_json jsonb NOT NULL DEFAULT '{}',
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at DESC);

CREATE TABLE IF NOT EXISTS integrations (
  org_id       uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  kind         text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  config_json  jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (org_id, kind)
);

-- ─── RLS ───────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations  ENABLE ROW LEVEL SECURITY;

-- Notifications: own rows only
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = notifications.user_id
        AND u.org_id = get_my_org_id()
    )
  );

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Integrations
CREATE POLICY "Org members can read integrations"
  ON integrations FOR SELECT TO authenticated
  USING (org_id = get_my_org_id());

CREATE POLICY "Admins can insert integrations"
  ON integrations FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update integrations"
  ON integrations FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "Admins can delete integrations"
  ON integrations FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));
