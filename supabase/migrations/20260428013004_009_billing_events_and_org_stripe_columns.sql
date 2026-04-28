/*
  # Billing Events and Stripe Organization Columns

  Adds Stripe billing infrastructure to support the BillingPanel admin UI.

  1. New Columns on `organizations`
    - `stripe_customer_id` (text) — Stripe customer ID linked to this org
    - `stripe_subscription_id` (text) — active Stripe subscription ID
    - `renewal_date` (timestamptz) — next billing renewal date from Stripe
    - `payment_method_last4` (text) — last 4 digits of the card on file

  2. New Table: `billing_events`
    - `id` (uuid, PK)
    - `org_id` (uuid, FK → organizations)
    - `stripe_customer_id` (text) — redundant for easy lookup
    - `stripe_subscription_id` (text)
    - `event_type` (text) — e.g. customer.subscription.created
    - `plan` (text) — plan name at time of event
    - `payload_json` (jsonb) — full Stripe event payload for audit
    - `created_at` (timestamptz)

  3. Security
    - RLS on `billing_events`
    - Admins can read their org's billing events
    - Only service_role (webhooks) can insert (no authenticated insert policy needed)
*/

-- Add Stripe columns to organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN stripe_subscription_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'renewal_date'
  ) THEN
    ALTER TABLE organizations ADD COLUMN renewal_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'payment_method_last4'
  ) THEN
    ALTER TABLE organizations ADD COLUMN payment_method_last4 text;
  END IF;
END $$;

-- Create billing_events table
CREATE TABLE IF NOT EXISTS billing_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  stripe_customer_id     text NOT NULL DEFAULT '',
  stripe_subscription_id text NOT NULL DEFAULT '',
  event_type             text NOT NULL DEFAULT '',
  plan                   text NOT NULL DEFAULT '',
  payload_json           jsonb NOT NULL DEFAULT '{}',
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_events_org_id_idx ON billing_events (org_id);
CREATE INDEX IF NOT EXISTS billing_events_created_at_idx ON billing_events (created_at DESC);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Admins can read their org's billing events
CREATE POLICY "Admins can read org billing events"
  ON billing_events FOR SELECT TO authenticated
  USING (
    org_id = get_my_org_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
