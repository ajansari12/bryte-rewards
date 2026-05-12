/*
  # Guard self-update of privileged columns via trigger

  Replaces the subquery-based WITH CHECK added in 017 with a BEFORE UPDATE
  trigger that preserves privileged columns whenever the caller is updating
  their own row and is not an admin.

  Privileged columns: role, org_id, points, manager_id.

  1. New Trigger Function
    - `guard_user_self_update()` — preserves privileged columns on self-update
      unless caller is admin. Runs BEFORE UPDATE with SECURITY DEFINER so it
      can check the caller's role without recursive RLS.

  2. Policy reset
    - Restore the simple self-update policy (USING + WITH CHECK id=auth.uid())
      so the logic lives in one place (the trigger).

  ## Notes
    1. Admin updates to their own row still go through the trigger but the
       admin branch short-circuits, allowing all column writes.
    2. Admin updates to other users flow through the "Admins can update
       teammates" policy added in 017.
*/

CREATE OR REPLACE FUNCTION guard_user_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_caller_role FROM users WHERE id = auth.uid();

  IF v_caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.id = auth.uid() THEN
    NEW.role := OLD.role;
    NEW.org_id := OLD.org_id;
    NEW.points := OLD.points;
    NEW.manager_id := OLD.manager_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_self_update ON users;
CREATE TRIGGER users_guard_self_update
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION guard_user_self_update();

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
