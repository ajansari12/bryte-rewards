/*
  # Harden RPCs and require value_id on recognitions

  1. `redeem_reward`: raise when org pool cannot cover the cost instead of
     silently clamping to zero. No schema change — just function replacement.
  2. `bootstrap_org_and_user`: reject empty display_name or org_name so Auth
     wizard failures surface as clear errors.
  3. `recognitions.value_id`: require NOT NULL so a buggy client can never
     persist a phantom-value recognition. A one-time backfill uses the
     org's lowest-sort-order value for any legacy null rows; if an org has
     no value at all, those rows are left untouched and the ALTER is skipped
     safely via a guard block.
  4. Security: functions remain SECURITY DEFINER with pinned search_path.
*/

-- 1) redeem_reward: error when pool is short
CREATE OR REPLACE FUNCTION redeem_reward(
  p_reward_id uuid,
  p_user_id   uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id       uuid;
  v_points_cost  int;
  v_user_points  int;
  v_pool         int;
  v_redemption_id uuid;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT org_id, points INTO v_org_id, v_points_cost
  FROM rewards
  WHERE id = p_reward_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'reward not found or inactive'; END IF;

  SELECT points INTO v_user_points
  FROM users
  WHERE id = p_user_id AND org_id = v_org_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found in org'; END IF;
  IF v_user_points < v_points_cost THEN RAISE EXCEPTION 'insufficient points'; END IF;

  SELECT points_pool_remaining INTO v_pool
  FROM organizations
  WHERE id = v_org_id
  FOR UPDATE;

  IF v_pool < v_points_cost THEN
    RAISE EXCEPTION 'organization pool insufficient';
  END IF;

  INSERT INTO redemptions (user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_points_cost, 'pending')
  RETURNING id INTO v_redemption_id;

  UPDATE users SET points = points - v_points_cost WHERE id = p_user_id;
  UPDATE organizations
  SET points_pool_remaining = points_pool_remaining - v_points_cost
  WHERE id = v_org_id;

  RETURN v_redemption_id;
END;
$$;

-- 2) bootstrap_org_and_user: validate inputs
CREATE OR REPLACE FUNCTION bootstrap_org_and_user(
  p_org_name text,
  p_display_name text,
  p_industry text DEFAULT 'technology'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  SELECT org_id INTO v_existing_org FROM users WHERE id = auth.uid();
  IF v_existing_org IS NOT NULL THEN
    RETURN v_existing_org;
  END IF;

  INSERT INTO organizations (name, industry, plan, points_pool_remaining, quarterly_pool)
  VALUES (btrim(p_org_name), coalesce(p_industry, 'technology'), 'free', 24000, 24000)
  RETURNING id INTO v_new_org_id;

  INSERT INTO users (id, org_id, display_name, role, title, points)
  VALUES (auth.uid(), v_new_org_id, btrim(p_display_name), 'admin', 'Admin', 0);

  RETURN v_new_org_id;
END;
$$;

-- 3) Backfill and enforce NOT NULL on recognitions.value_id
DO $$
DECLARE
  v_null_count int;
  v_fixable int;
BEGIN
  SELECT count(*) INTO v_null_count FROM recognitions WHERE value_id IS NULL;

  IF v_null_count > 0 THEN
    UPDATE recognitions r
    SET value_id = (
      SELECT v.id FROM values v
      WHERE v.org_id = r.org_id
      ORDER BY v.sort_order NULLS LAST, v.name
      LIMIT 1
    )
    WHERE r.value_id IS NULL
      AND EXISTS (SELECT 1 FROM values v WHERE v.org_id = r.org_id);
  END IF;

  SELECT count(*) INTO v_fixable FROM recognitions WHERE value_id IS NULL;
  IF v_fixable = 0 THEN
    BEGIN
      ALTER TABLE recognitions ALTER COLUMN value_id SET NOT NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not set NOT NULL: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '% recognitions still have null value_id (org has no values); leaving column nullable', v_fixable;
  END IF;
END $$;
