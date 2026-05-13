/*
  # SECURITY DEFINER → INVOKER wrappers

  1. Hardening
    - Tighten the demo_requests INSERT policy: WITH CHECK validates required
      fields are non-empty and the row's status is 'new' on creation.
    - Move the SECURITY DEFINER bodies of `get_my_org_id`,
      `bootstrap_org_and_user`, and `redeem_reward` into a private schema
      (`private_rpc`) that is not exposed via PostgREST.
    - Replace the public-schema entry points with SECURITY INVOKER wrappers
      that delegate to the private DEFINER bodies. RLS policies that reference
      `get_my_org_id()` continue to resolve to the public wrapper without any
      policy rewrites.
    - Convert `leaderboard_top` and `finalize_onboarding` to SECURITY INVOKER
      since RLS on the underlying tables already covers their access checks.

  2. Notes
    - Anonymous and unauthenticated users still cannot reach the private
      schema directly; PostgREST only exposes objects in `public`.
    - All public wrappers preserve the original signatures, so existing
      callers continue to work without changes.
*/

-- 1. demo_requests: INSERT check no longer always-true ----------------------
DROP POLICY IF EXISTS "Anyone can submit a demo request" ON public.demo_requests;

CREATE POLICY "Anyone can submit a demo request"
  ON public.demo_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    btrim(coalesce(first_name, '')) <> ''
    AND btrim(coalesce(last_name, '')) <> ''
    AND btrim(coalesce(work_email, '')) <> ''
    AND work_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND btrim(coalesce(company, '')) <> ''
    AND btrim(coalesce(team_size, '')) <> ''
    AND status = 'new'
  );

-- 2. Private schema for DEFINER bodies --------------------------------------
CREATE SCHEMA IF NOT EXISTS private_rpc;
REVOKE ALL ON SCHEMA private_rpc FROM PUBLIC, anon, authenticated;
GRANT  USAGE ON SCHEMA private_rpc TO authenticated;

-- 3. private_rpc.get_my_org_id (DEFINER, locked search_path) ----------------
CREATE OR REPLACE FUNCTION private_rpc.get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION private_rpc.get_my_org_id() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION private_rpc.get_my_org_id() TO authenticated;

-- 4. public.get_my_org_id wrapper (INVOKER) ---------------------------------
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT private_rpc.get_my_org_id();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_org_id() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_org_id() TO authenticated;

-- 5. private_rpc.bootstrap_org_and_user (DEFINER) ---------------------------
CREATE OR REPLACE FUNCTION private_rpc.bootstrap_org_and_user(
  p_org_name text,
  p_display_name text,
  p_industry text DEFAULT 'technology'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_org uuid;
  v_new_org_id   uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF btrim(coalesce(p_org_name, '')) = '' THEN
    RAISE EXCEPTION 'org_name required';
  END IF;
  IF btrim(coalesce(p_display_name, '')) = '' THEN
    RAISE EXCEPTION 'display_name required';
  END IF;

  SELECT org_id INTO v_existing_org FROM public.users WHERE id = auth.uid();
  IF v_existing_org IS NOT NULL THEN
    RETURN v_existing_org;
  END IF;

  INSERT INTO public.organizations (name, industry, plan, points_pool_remaining, quarterly_pool)
  VALUES (btrim(p_org_name), coalesce(p_industry, 'technology'), 'free', 24000, 24000)
  RETURNING id INTO v_new_org_id;

  INSERT INTO public.users (id, org_id, display_name, role, title, points)
  VALUES (auth.uid(), v_new_org_id, btrim(p_display_name), 'admin', 'Admin', 0);

  RETURN v_new_org_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION private_rpc.bootstrap_org_and_user(text, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION private_rpc.bootstrap_org_and_user(text, text, text) TO authenticated;

-- 6. public.bootstrap_org_and_user wrapper (INVOKER) ------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_org_and_user(
  p_org_name text,
  p_display_name text,
  p_industry text DEFAULT 'technology'
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT private_rpc.bootstrap_org_and_user(p_org_name, p_display_name, p_industry);
$$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_org_and_user(text, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.bootstrap_org_and_user(text, text, text) TO authenticated;

-- 7. private_rpc.redeem_reward (DEFINER) ------------------------------------
CREATE OR REPLACE FUNCTION private_rpc.redeem_reward(
  p_reward_id uuid,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id        uuid;
  v_points_cost   int;
  v_user_points   int;
  v_pool          int;
  v_redemption_id uuid;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT org_id, points INTO v_org_id, v_points_cost
  FROM public.rewards
  WHERE id = p_reward_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'reward not found or inactive'; END IF;

  SELECT points INTO v_user_points
  FROM public.users
  WHERE id = p_user_id AND org_id = v_org_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found in org'; END IF;
  IF v_user_points < v_points_cost THEN RAISE EXCEPTION 'insufficient points'; END IF;

  SELECT points_pool_remaining INTO v_pool
  FROM public.organizations
  WHERE id = v_org_id
  FOR UPDATE;

  IF v_pool < v_points_cost THEN
    RAISE EXCEPTION 'organization pool insufficient';
  END IF;

  INSERT INTO public.redemptions (user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_points_cost, 'pending')
  RETURNING id INTO v_redemption_id;

  UPDATE public.users SET points = points - v_points_cost WHERE id = p_user_id;
  UPDATE public.organizations
  SET points_pool_remaining = points_pool_remaining - v_points_cost
  WHERE id = v_org_id;

  RETURN v_redemption_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION private_rpc.redeem_reward(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION private_rpc.redeem_reward(uuid, uuid) TO authenticated;

-- 8. public.redeem_reward wrapper (INVOKER) ---------------------------------
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_reward_id uuid,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT private_rpc.redeem_reward(p_reward_id, p_user_id);
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_reward(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.redeem_reward(uuid, uuid) TO authenticated;

-- 9. leaderboard_top → SECURITY INVOKER -------------------------------------
CREATE OR REPLACE FUNCTION public.leaderboard_top(
  p_org_id uuid,
  p_since timestamptz,
  p_until timestamptz,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  role text,
  avatar_url text,
  points_sum bigint,
  recognition_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    u.id AS user_id,
    u.display_name,
    u.role,
    u.avatar_url,
    COALESCE(SUM(r.points), 0)::bigint AS points_sum,
    COUNT(r.id)::bigint AS recognition_count
  FROM public.users u
  LEFT JOIN public.recognitions r
    ON r.recipient_id = u.id
   AND r.org_id = p_org_id
   AND r.created_at >= p_since
   AND r.created_at < p_until
  WHERE u.org_id = p_org_id
    AND u.org_id = public.get_my_org_id()
  GROUP BY u.id, u.display_name, u.role, u.avatar_url
  ORDER BY points_sum DESC, u.display_name ASC
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION public.leaderboard_top(uuid, timestamptz, timestamptz, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.leaderboard_top(uuid, timestamptz, timestamptz, integer) TO authenticated;

-- 10. finalize_onboarding → SECURITY INVOKER --------------------------------
CREATE OR REPLACE FUNCTION public.finalize_onboarding(p_org_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name             text;
  v_industry         text;
  v_invites_skipped  timestamptz;
  v_values           int;
  v_badges           int;
  v_rewards          int;
  v_members          int;
  v_caller_org       uuid;
  v_caller_role      text;
  v_finalized        timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT org_id, role INTO v_caller_org, v_caller_role
  FROM public.users WHERE id = auth.uid();
  IF v_caller_org IS DISTINCT FROM p_org_id OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'only org admins may finalize onboarding';
  END IF;

  SELECT name, industry, invites_skipped_at
  INTO v_name, v_industry, v_invites_skipped
  FROM public.organizations WHERE id = p_org_id;

  IF btrim(coalesce(v_name, '')) = '' THEN
    RAISE EXCEPTION 'organisation name required';
  END IF;
  IF btrim(coalesce(v_industry, '')) = '' THEN
    RAISE EXCEPTION 'industry required';
  END IF;

  SELECT count(*) INTO v_values  FROM public.values  WHERE org_id = p_org_id;
  IF v_values = 0 THEN RAISE EXCEPTION 'at least one value required'; END IF;

  SELECT count(*) INTO v_badges  FROM public.badges  WHERE org_id = p_org_id;
  IF v_badges = 0 THEN RAISE EXCEPTION 'at least one badge required'; END IF;

  SELECT count(*) INTO v_rewards FROM public.rewards WHERE org_id = p_org_id;
  IF v_rewards = 0 THEN RAISE EXCEPTION 'at least one reward required'; END IF;

  SELECT count(*) INTO v_members FROM public.users   WHERE org_id = p_org_id;
  IF v_members < 2 AND v_invites_skipped IS NULL THEN
    RAISE EXCEPTION 'invite at least one teammate or skip this step';
  END IF;

  UPDATE public.organizations
  SET onboarded_at = now()
  WHERE id = p_org_id
  RETURNING onboarded_at INTO v_finalized;

  RETURN v_finalized;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_onboarding(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.finalize_onboarding(uuid) TO authenticated;
