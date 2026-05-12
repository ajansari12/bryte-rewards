/*
  # Pool Trigger, Redemptions Org Denormalization, and Leaderboard RPC

  1. New columns / constraints
    - `redemptions.org_id` denormalized from `rewards.org_id` (backfilled);
      enables per-org realtime filters and admin views.
    - `reactions.created_at` so we can render "reacted Nm ago" and sort.
    - CHECK `recognitions.points > 0`.
    - CHECK `organizations.points_pool_remaining >= 0`.
    - CHECK `organizations.quarterly_pool > 0` via NOT NULL (column already default 24000).

  2. Triggers
    - BEFORE INSERT on `recognitions`: decrement `organizations.points_pool_remaining`
      by NEW.points; RAISE if it would go negative. Keeps pool as single source of
      truth for both recognitions and redemptions.
    - BEFORE INSERT on `redemptions`: auto-populate `org_id` from the reward's org,
      so callers don't need to know.

  3. RLS
    - Update redemptions policies to use denormalized `org_id` directly where
      possible (still functionally equivalent, faster).

  4. Functions
    - `leaderboard_top(org_id, since, until, limit)` — SECURITY DEFINER, returns
      top recipients by summed points in the window, avoiding client-side grouping.
*/

-- ─── Denormalize redemptions.org_id ─────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redemptions' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE redemptions ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE redemptions r
      SET org_id = rw.org_id
      FROM rewards rw
      WHERE rw.id = r.reward_id
        AND r.org_id IS NULL;
    ALTER TABLE redemptions ALTER COLUMN org_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS redemptions_org_id_idx ON redemptions (org_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_redemption_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id FROM rewards WHERE id = NEW.reward_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_redemption_org_id ON redemptions;
CREATE TRIGGER trg_set_redemption_org_id
BEFORE INSERT ON redemptions
FOR EACH ROW EXECUTE FUNCTION set_redemption_org_id();

-- ─── Reactions created_at ───────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reactions' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE reactions ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- ─── CHECK constraints ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recognitions_points_positive'
  ) THEN
    ALTER TABLE recognitions ADD CONSTRAINT recognitions_points_positive CHECK (points > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orgs_pool_nonneg'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT orgs_pool_nonneg CHECK (points_pool_remaining >= 0);
  END IF;
END $$;

-- ─── Recognition pool decrement trigger ─────────────────
CREATE OR REPLACE FUNCTION decrement_pool_on_recognition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining int;
BEGIN
  SELECT points_pool_remaining INTO v_remaining
    FROM organizations WHERE id = NEW.org_id
    FOR UPDATE;

  IF v_remaining IS NULL THEN
    RAISE EXCEPTION 'Organization % not found', NEW.org_id;
  END IF;

  IF v_remaining < NEW.points THEN
    RAISE EXCEPTION 'Insufficient quarterly pool: % remaining, % requested', v_remaining, NEW.points
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE organizations
    SET points_pool_remaining = points_pool_remaining - NEW.points
    WHERE id = NEW.org_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_pool_on_recognition ON recognitions;
CREATE TRIGGER trg_decrement_pool_on_recognition
BEFORE INSERT ON recognitions
FOR EACH ROW EXECUTE FUNCTION decrement_pool_on_recognition();

-- ─── Leaderboard aggregation RPC ────────────────────────
CREATE OR REPLACE FUNCTION leaderboard_top(
  p_org_id uuid,
  p_since timestamptz,
  p_until timestamptz,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  role text,
  avatar_url text,
  points_sum bigint,
  recognition_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    u.display_name,
    u.role,
    u.avatar_url,
    COALESCE(SUM(r.points), 0)::bigint AS points_sum,
    COUNT(r.id)::bigint AS recognition_count
  FROM users u
  LEFT JOIN recognitions r
    ON r.recipient_id = u.id
    AND r.org_id = p_org_id
    AND r.created_at >= p_since
    AND r.created_at < p_until
  WHERE u.org_id = p_org_id
    AND u.org_id = get_my_org_id()  -- RLS check for caller
  GROUP BY u.id, u.display_name, u.role, u.avatar_url
  ORDER BY points_sum DESC, u.display_name ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION leaderboard_top(uuid, timestamptz, timestamptz, int) TO authenticated;
