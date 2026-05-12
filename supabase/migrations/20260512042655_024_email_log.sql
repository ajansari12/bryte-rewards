/*
  # Email delivery log

  1. New tables
    - `email_log`
      - `id` uuid primary key
      - `org_id` uuid (nullable for system mail)
      - `to_email` text
      - `template` text (e.g. 'weekly_digest', 'redemption_fulfilled')
      - `status` text check in ('queued','sent','failed')
      - `provider_message_id` text
      - `error` text
      - `created_at` timestamptz default now()
  2. Security
    - RLS enabled; admins in the same org may SELECT their rows.
    - INSERTs happen from edge functions using the service role (bypasses RLS).
*/

CREATE TABLE IF NOT EXISTS email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  to_email text NOT NULL,
  template text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  provider_message_id text,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_log_org_created_idx ON email_log (org_id, created_at DESC);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read their org email log" ON email_log;
CREATE POLICY "Admins read their org email log"
  ON email_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND (email_log.org_id IS NULL OR u.org_id = email_log.org_id)
    )
  );
