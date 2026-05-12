/*
  # Audit log for compliance

  1. New tables
    - `audit_log` — append-only record of sensitive changes
      - `id` uuid primary key
      - `org_id` uuid (nullable for system rows) — scoped reader access
      - `actor_id` uuid (nullable, from auth.uid())
      - `action` text — e.g. 'update', 'insert', 'delete'
      - `table_name` text
      - `row_id` uuid
      - `before` jsonb
      - `after` jsonb
      - `created_at` timestamptz default now()
  2. Triggers
    - `audit_redemption_changes` — logs every UPDATE on redemptions
    - `audit_user_privilege_changes` — logs role or points changes on users
    - `audit_org_plan_changes` — logs plan/billing_status changes on organizations
    All triggers are SECURITY DEFINER with pinned search_path so inserts
    bypass the restrictive RLS on audit_log.
  3. Security
    - RLS enabled; admins in the same org may SELECT; nobody can UPDATE/DELETE.
    - INSERT is blocked for clients; only trigger functions (SECURITY DEFINER) insert.
*/

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  actor_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  row_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_org_created_idx ON audit_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_row_idx ON audit_log (table_name, row_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read their org audit log" ON audit_log;
CREATE POLICY "Admins read their org audit log"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND (audit_log.org_id IS NULL OR u.org_id = audit_log.org_id)
    )
  );

-- Redemption audit
CREATE OR REPLACE FUNCTION audit_redemption_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM users WHERE id = NEW.user_id;
  INSERT INTO audit_log (org_id, actor_id, action, table_name, row_id, before, after)
  VALUES (v_org_id, auth.uid(), 'update', 'redemptions', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS redemptions_audit ON redemptions;
CREATE TRIGGER redemptions_audit
AFTER UPDATE ON redemptions
FOR EACH ROW EXECUTE FUNCTION audit_redemption_changes();

-- User privilege audit (role or points change)
CREATE OR REPLACE FUNCTION audit_user_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.points IS DISTINCT FROM OLD.points THEN
    INSERT INTO audit_log (org_id, actor_id, action, table_name, row_id, before, after)
    VALUES (NEW.org_id, auth.uid(), 'update', 'users', NEW.id,
      jsonb_build_object('role', OLD.role, 'points', OLD.points),
      jsonb_build_object('role', NEW.role, 'points', NEW.points));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_audit ON users;
CREATE TRIGGER users_audit
AFTER UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION audit_user_privilege_changes();

-- Organization plan/billing audit
CREATE OR REPLACE FUNCTION audit_org_plan_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.billing_status IS DISTINCT FROM OLD.billing_status
     OR NEW.quarterly_pool IS DISTINCT FROM OLD.quarterly_pool THEN
    INSERT INTO audit_log (org_id, actor_id, action, table_name, row_id, before, after)
    VALUES (NEW.id, auth.uid(), 'update', 'organizations', NEW.id,
      jsonb_build_object('plan', OLD.plan, 'billing_status', OLD.billing_status, 'quarterly_pool', OLD.quarterly_pool),
      jsonb_build_object('plan', NEW.plan, 'billing_status', NEW.billing_status, 'quarterly_pool', NEW.quarterly_pool));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_audit ON organizations;
CREATE TRIGGER organizations_audit
AFTER UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION audit_org_plan_changes();
