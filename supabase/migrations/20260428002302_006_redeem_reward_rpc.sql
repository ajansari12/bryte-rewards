/*
  # Redeem Reward RPC

  Atomic function to create a redemption and deduct points from the user's
  balance and the org's points pool in a single transaction.

  Security: SECURITY DEFINER so it can update the points_pool_remaining
  column (which is not directly writable by end users via RLS), but it
  validates the caller is the user making the redemption.
*/

CREATE OR REPLACE FUNCTION redeem_reward(
  p_reward_id uuid,
  p_user_id   uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id       uuid;
  v_points_cost  int;
  v_user_points  int;
  v_pool         int;
  v_redemption_id uuid;
BEGIN
  -- Caller must be the user making the redemption
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Fetch reward cost and org
  SELECT org_id, points INTO v_org_id, v_points_cost
  FROM rewards
  WHERE id = p_reward_id AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reward not found or inactive';
  END IF;

  -- Fetch user's current points
  SELECT points INTO v_user_points
  FROM users
  WHERE id = p_user_id AND org_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found in org';
  END IF;

  IF v_user_points < v_points_cost THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;

  -- Fetch pool
  SELECT points_pool_remaining INTO v_pool
  FROM organizations
  WHERE id = v_org_id;

  -- Insert redemption
  INSERT INTO redemptions (user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_points_cost, 'pending')
  RETURNING id INTO v_redemption_id;

  -- Deduct from user balance
  UPDATE users SET points = points - v_points_cost WHERE id = p_user_id;

  -- Deduct from org pool
  UPDATE organizations
  SET points_pool_remaining = GREATEST(0, points_pool_remaining - v_points_cost)
  WHERE id = v_org_id;

  RETURN v_redemption_id;
END;
$$;
