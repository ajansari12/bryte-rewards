/*
  # Billing status and quarterly pool reset

  1. New columns
    - `organizations.billing_status` (text, default 'active') — one of
      'active', 'past_due', 'canceled'. Surfaced in admin billing UI
      when payment fails.

  2. Scheduled job
    - pg_cron job `reset_quarterly_pool` runs at 00:05 UTC on the
      1st of Jan/Apr/Jul/Oct and resets `points_pool_remaining`
      to `quarterly_pool` for every org with billing_status = 'active'.

  3. Security
    - No RLS changes. billing_status is only writable by service role
      via existing organizations policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'billing_status'
  ) THEN
    ALTER TABLE organizations
      ADD COLUMN billing_status text NOT NULL DEFAULT 'active'
      CHECK (billing_status IN ('active', 'past_due', 'canceled'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.reset_quarterly_pool()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE organizations
     SET points_pool_remaining = quarterly_pool
   WHERE billing_status = 'active';
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('reset_quarterly_pool')
      FROM cron.job WHERE jobname = 'reset_quarterly_pool';
    PERFORM cron.schedule(
      'reset_quarterly_pool',
      '5 0 1 1,4,7,10 *',
      $cron$SELECT public.reset_quarterly_pool();$cron$
    );
  END IF;
END $$;
