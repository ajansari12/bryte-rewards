/*
  # Finalize onboarding RPC and invites-skipped flag

  1. Adds `invites_skipped_at timestamptz` to `organizations` to mark that the
     admin intentionally skipped the "invite teammates" step.
  2. Adds `finalize_onboarding(p_org_id uuid)` SECURITY DEFINER RPC. It
     re-verifies on the server that the org has:
       - non-empty name and industry
       - at least one value
       - at least one badge
       - at least one reward
       - at least one teammate (user) OR invites_skipped_at set
     before stamping `onboarded_at = now()`. Only admins of the org can call.
  3. Pins search_path for safety.
*/

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS invites_skipped_at timestamptz;

CREATE OR REPLACE FUNCTION finalize_onboarding(p_org_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_industry text;
  v_invites_skipped timestamptz;
  v_values int;
  v_badges int;
  v_rewards int;
  v_members int;
  v_caller_org uuid;
  v_caller_role text;
  v_finalized timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT org_id, role INTO v_caller_org, v_caller_role
  FROM users WHERE id = auth.uid();
  IF v_caller_org IS DISTINCT FROM p_org_id OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'only org admins may finalize onboarding';
  END IF;

  SELECT name, industry, invites_skipped_at
    INTO v_name, v_industry, v_invites_skipped
  FROM organizations WHERE id = p_org_id;

  IF btrim(coalesce(v_name, '')) = '' THEN
    RAISE EXCEPTION 'organisation name required';
  END IF;
  IF btrim(coalesce(v_industry, '')) = '' THEN
    RAISE EXCEPTION 'industry required';
  END IF;

  SELECT count(*) INTO v_values FROM values WHERE org_id = p_org_id;
  IF v_values = 0 THEN RAISE EXCEPTION 'at least one value required'; END IF;

  SELECT count(*) INTO v_badges FROM badges WHERE org_id = p_org_id;
  IF v_badges = 0 THEN RAISE EXCEPTION 'at least one badge required'; END IF;

  SELECT count(*) INTO v_rewards FROM rewards WHERE org_id = p_org_id;
  IF v_rewards = 0 THEN RAISE EXCEPTION 'at least one reward required'; END IF;

  SELECT count(*) INTO v_members FROM users WHERE org_id = p_org_id;
  IF v_members < 2 AND v_invites_skipped IS NULL THEN
    RAISE EXCEPTION 'invite at least one teammate or skip this step';
  END IF;

  UPDATE organizations
    SET onboarded_at = now()
    WHERE id = p_org_id
    RETURNING onboarded_at INTO v_finalized;

  RETURN v_finalized;
END;
$$;

REVOKE ALL ON FUNCTION finalize_onboarding(uuid) FROM public;
GRANT EXECUTE ON FUNCTION finalize_onboarding(uuid) TO authenticated;
