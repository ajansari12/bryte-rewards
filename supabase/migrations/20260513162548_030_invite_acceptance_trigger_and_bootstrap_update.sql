/*
  # Invite acceptance trigger + bootstrap RPC update

  Plain English:
    When a teammate accepts an emailed invite, Supabase Auth creates a new row
    in `auth.users` and stamps the invite payload (org_id + role) into
    `raw_user_meta_data`. Until now, nothing read that payload, so the new
    teammate landed in onboarding and accidentally created a brand-new
    organization. This migration fixes that in two ways:

    1. A SECURITY DEFINER trigger on `auth.users` insert auto-creates a
       matching row in `public.users` whenever the auth metadata carries an
       `org_id`. The user is added to the inviter's organization with the
       requested role.

    2. `bootstrap_org_and_user` is updated to honor an existing membership
       (it already short-circuited when `users` had a row) and to fall back
       to `auth.jwt() -> 'user_metadata' -> 'org_id'` if for some reason the
       trigger did not run. This keeps onboarding correct without creating a
       second org.

  1. New objects
    - Function `handle_new_auth_user()` (SECURITY DEFINER)
    - Trigger `on_auth_user_created` AFTER INSERT ON auth.users

  2. Modified objects
    - Function `bootstrap_org_and_user(text, text)` — now honors
      `user_metadata.org_id` so invitees never spawn a duplicate org.

  3. Security
    - The trigger function is SECURITY DEFINER but only ever inserts a single
      row keyed on `NEW.id` (the brand new auth user). It validates that the
      referenced org_id exists before inserting.
    - bootstrap_org_and_user remains restricted to authenticated callers.
*/

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_role   text;
  v_name   text;
BEGIN
  -- Only act when an org_id is present in the invite metadata.
  IF NEW.raw_user_meta_data IS NULL
     OR NEW.raw_user_meta_data ->> 'org_id' IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_org_id := (NEW.raw_user_meta_data ->> 'org_id')::uuid;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;

  -- Skip if the referenced org no longer exists.
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
    RETURN NEW;
  END IF;

  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'employee');
  IF v_role NOT IN ('employee', 'manager', 'admin') THEN
    v_role := 'employee';
  END IF;

  v_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    ''
  );

  INSERT INTO users (id, org_id, display_name, role)
  VALUES (NEW.id, v_org_id, v_name, v_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Update bootstrap RPC to honor user_metadata.org_id (defensive fallback for
-- the case where the trigger didn't run, e.g. a pre-existing auth user).
CREATE OR REPLACE FUNCTION bootstrap_org_and_user(
  p_org_name text,
  p_display_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_existing_org uuid;
  v_meta_org_id uuid;
  v_meta_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT org_id INTO v_existing_org FROM users WHERE id = v_uid;
  IF v_existing_org IS NOT NULL THEN
    RETURN v_existing_org;
  END IF;

  -- If the user was invited (jwt user_metadata carries org_id), honor it
  -- instead of creating a new org.
  BEGIN
    v_meta_org_id := NULLIF(auth.jwt() -> 'user_metadata' ->> 'org_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_meta_org_id := NULL;
  END;

  IF v_meta_org_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM organizations WHERE id = v_meta_org_id) THEN
    v_meta_role := COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', 'employee');
    IF v_meta_role NOT IN ('employee', 'manager', 'admin') THEN
      v_meta_role := 'employee';
    END IF;

    INSERT INTO users (id, org_id, display_name, role)
    VALUES (
      v_uid,
      v_meta_org_id,
      COALESCE(NULLIF(btrim(p_display_name), ''), ''),
      v_meta_role
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN v_meta_org_id;
  END IF;

  INSERT INTO organizations (name)
  VALUES (COALESCE(NULLIF(btrim(p_org_name), ''), 'My Organisation'))
  RETURNING id INTO v_org_id;

  INSERT INTO users (id, org_id, display_name, role)
  VALUES (
    v_uid,
    v_org_id,
    COALESCE(NULLIF(btrim(p_display_name), ''), ''),
    'admin'
  );

  RETURN v_org_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION bootstrap_org_and_user(text, text) FROM public;
REVOKE EXECUTE ON FUNCTION bootstrap_org_and_user(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION bootstrap_org_and_user(text, text) TO authenticated;
