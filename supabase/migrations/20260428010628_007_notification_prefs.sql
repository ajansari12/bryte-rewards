/*
  # Add notification_prefs to users

  1. Changes
    - `users` — new column `notification_prefs jsonb NOT NULL DEFAULT '{"in_app":true,"email_immediate":false,"email_digest":true}'`
      Controls per-user preferences for in-app, immediate email, and weekly digest notifications.

  2. Index
    - Expression index on `notification_prefs->>'email_digest'` for efficient querying of digest recipients.

  3. Notes
    - Existing rows get the default value automatically.
    - The on-recognition-insert and weekly-digest functions read this column server-side.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'notification_prefs'
  ) THEN
    ALTER TABLE users
      ADD COLUMN notification_prefs jsonb NOT NULL
        DEFAULT '{"in_app":true,"email_immediate":false,"email_digest":true}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_email_digest_idx
  ON users ((notification_prefs->>'email_digest'));
