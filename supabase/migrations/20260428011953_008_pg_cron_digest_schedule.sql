/*
  # Enable pg_cron and pg_net, seed Vault, schedule weekly digest

  1. Extensions enabled
     - pg_cron  : Postgres-native job scheduler
     - pg_net   : Async outbound HTTP from SQL

  2. Vault secret  service_role_key
     - Stores the Supabase service-role JWT.
     - Idempotent: only created when the name is absent.
     - Placeholder value written here; replace with the real JWT by running:
         UPDATE vault.secrets
         SET secret = '<your-service-role-jwt>'
         WHERE name = 'service_role_key';

  3. Cron job  weekly-digest
     - Fires every Monday at 13:00 UTC.
     - Calls weekly-digest Edge Function via pg_net using the Vault JWT.
     - Idempotent: existing job removed before scheduling.

  4. Testing
     Temporarily speed up the schedule to every 5 minutes then revert:
         SELECT cron.alter_job(jobid, schedule)
         FROM cron.job
         WHERE jobname = 'weekly-digest';
     Check run history:
         SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
*/

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Store service-role JWT in Vault (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'service_role_key'
  ) THEN
    PERFORM vault.create_secret(
      'REPLACE_WITH_SERVICE_ROLE_JWT',
      'service_role_key',
      'Supabase service-role JWT used by pg_cron to invoke Edge Functions'
    );
  END IF;
END $$;

-- 3. Remove existing job if present, then schedule (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-digest') THEN
    PERFORM cron.unschedule('weekly-digest');
  END IF;
END $$;

SELECT cron.schedule(
  'weekly-digest',
  '0 13 * * 1',
  $$
    SELECT net.http_post(
      url     := 'https://bdotcbeocaxonvnsdxus.supabase.co/functions/v1/weekly-digest',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'service_role_key'
          LIMIT 1
        ),
        'Content-Type', 'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);
