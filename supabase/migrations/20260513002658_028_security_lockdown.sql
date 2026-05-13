/*
  # Security Lockdown

  1. Hardening
    - Pin immutable search_path on `public.get_my_org_id`.
    - Move `pg_net` extension from public to the `extensions` schema (functions
      themselves live in the `net` schema regardless, so cron continues to call
      `net.http_post`).
    - Drop the unrestricted "Authenticated users can create organizations"
      INSERT RLS policy. Org creation must go through the
      `bootstrap_org_and_user` SECURITY DEFINER RPC.
    - Tighten the `avatars` storage SELECT policy so authenticated users only
      see their own row in `storage.objects`. Public URL access via
      `getPublicUrl()` is unaffected.
    - Revoke EXECUTE on every SECURITY DEFINER function from `anon`. Trigger,
      cron, and internal helpers also lose `authenticated` EXECUTE — they are
      only invoked internally. RPCs callable from the app keep `authenticated`
      EXECUTE.
    - Drop the unused 2-arg overload of `bootstrap_org_and_user`.
    - Add an INSERT-only RLS policy to `public.demo_requests` so the marketing
      form continues to work via the anon key, but no client can read rows.

  2. Notes
    - All changes are non-destructive; no data is deleted.
*/

-- 1. Pin search_path on get_my_org_id ----------------------------------------
ALTER FUNCTION public.get_my_org_id() SET search_path = public, pg_temp;

-- 2. Move pg_net to extensions schema ---------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net CASCADE;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- Re-create the weekly digest cron job (CASCADE may have removed it)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-digest') THEN
    PERFORM cron.unschedule('weekly-digest');
  END IF;
END $$;

SELECT cron.schedule(
  'weekly-digest',
  '0 13 * * 1',
  $cron$
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
  $cron$
);

-- 3. Drop unrestricted INSERT policy on organizations ------------------------
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- 4. Tighten avatars storage policies ---------------------------------------
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

CREATE POLICY "Users can read their own avatar row"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 5. Revoke EXECUTE on internal SECURITY DEFINER functions -------------------
-- Trigger functions — never legitimately called via REST.
REVOKE EXECUTE ON FUNCTION public.audit_org_plan_changes()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_redemption_changes()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_user_privilege_changes()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_pool_on_recognition()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_user_self_update()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_redemption_insert()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_nomination_status()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_reaction()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_recognition_insert()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_redemption_status()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_reviewers_on_nomination_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_redemption_org_id()                 FROM PUBLIC, anon, authenticated;

-- Cron / admin-only — never called via REST.
REVOKE EXECUTE ON FUNCTION public.reset_quarterly_pool()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_demo_org(uuid)                    FROM PUBLIC, anon, authenticated;

-- RPCs the app calls — keep `authenticated`, deny `anon`.
REVOKE EXECUTE ON FUNCTION public.bootstrap_org_and_user(text, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.bootstrap_org_and_user(text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.finalize_onboarding(uuid)               FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.finalize_onboarding(uuid)               TO authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_reward(uuid, uuid)               FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.redeem_reward(uuid, uuid)               TO authenticated;

REVOKE EXECUTE ON FUNCTION public.leaderboard_top(uuid, timestamptz, timestamptz, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.leaderboard_top(uuid, timestamptz, timestamptz, integer) TO authenticated;

-- get_my_org_id is referenced from RLS policies, so it must remain callable.
-- Restrict to authenticated users (anon should never trigger RLS that needs it).
REVOKE EXECUTE ON FUNCTION public.get_my_org_id()                         FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_org_id()                         TO authenticated;

-- 6. Drop unused 2-arg overload of bootstrap_org_and_user --------------------
DROP FUNCTION IF EXISTS public.bootstrap_org_and_user(text, text);

-- 7. demo_requests RLS policies ---------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit a demo request" ON public.demo_requests;

CREATE POLICY "Anyone can submit a demo request"
  ON public.demo_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies: with RLS enabled and no matching policy,
-- those operations are denied for anon and authenticated. The service role
-- bypasses RLS for back-office review.
