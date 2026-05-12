/*
  # Demo org hygiene

  1. Adds `is_demo boolean` to `organizations` (default false).
  2. Backfills `is_demo = true` for the six seeded demo orgs (UUIDs documented
     in supabase/seeds/industry-packs.sql, prefixed 10000000-...).
  3. Adds `reset_demo_org(p_org_id uuid)` RPC that deletes recognitions,
     reactions, comments, redemptions, notifications, and nominations for a
     single demo org. Restricted to `is_demo = true` to protect real data.
  4. Security: RPC is SECURITY DEFINER with pinned search_path. Caller must
     be an admin in the target org.
*/

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

UPDATE organizations
  SET is_demo = true
  WHERE id IN (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000006'
  );

CREATE OR REPLACE FUNCTION reset_demo_org(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_demo boolean;
  v_caller_org uuid;
  v_caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT is_demo INTO v_is_demo FROM organizations WHERE id = p_org_id;
  IF NOT FOUND OR NOT v_is_demo THEN
    RAISE EXCEPTION 'reset_demo_org is only allowed on demo organizations';
  END IF;

  SELECT org_id, role INTO v_caller_org, v_caller_role FROM users WHERE id = auth.uid();
  IF v_caller_org IS DISTINCT FROM p_org_id OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'caller must be admin of the demo org';
  END IF;

  DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE org_id = p_org_id);
  DELETE FROM reactions WHERE recognition_id IN (SELECT id FROM recognitions WHERE org_id = p_org_id);
  DELETE FROM comments WHERE recognition_id IN (SELECT id FROM recognitions WHERE org_id = p_org_id);
  DELETE FROM recognitions WHERE org_id = p_org_id;
  DELETE FROM redemptions WHERE user_id IN (SELECT id FROM users WHERE org_id = p_org_id);
  DELETE FROM nominations WHERE org_id = p_org_id;
END;
$$;

REVOKE ALL ON FUNCTION reset_demo_org(uuid) FROM public;
GRANT EXECUTE ON FUNCTION reset_demo_org(uuid) TO authenticated;
