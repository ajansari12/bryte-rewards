/*
  # Redemption fulfillment resend tracking

  1. Modified Tables
    - `redemptions`
      - `resent_at` (timestamptz, nullable) — timestamp of most recent resend
      - `resent_count` (int, default 0) — count of resends via fulfill-redemption
  2. Security
    - No RLS changes (existing policies cover these columns).
  3. Important notes
    1. The fulfill-redemption edge function will bump these values when called
       with `{ resend: true }`.
    2. A reasonable max of 3 resends per redemption is enforced in the function,
       not via a DB constraint, so admins can be granted exceptions later.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redemptions' AND column_name = 'resent_at'
  ) THEN
    ALTER TABLE redemptions ADD COLUMN resent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redemptions' AND column_name = 'resent_count'
  ) THEN
    ALTER TABLE redemptions ADD COLUMN resent_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;
