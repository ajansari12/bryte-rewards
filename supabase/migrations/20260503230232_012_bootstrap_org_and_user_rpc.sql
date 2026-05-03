/*
  # bootstrap_org_and_user RPC

  1. New Function
    - `bootstrap_org_and_user(p_org_name text, p_display_name text)`
      - SECURITY DEFINER so it can bypass RLS for the brand-new user who has
        no profile row yet and therefore fails the existing "authenticated"
        insert policies on the first request.
      - Requires an authenticated caller (`auth.uid()` must be set).
      - Is idempotent: if the caller already has a `users` row, returns the
        existing `org_id` instead of creating duplicates.
      - Creates the organization and the caller's user profile with the
        `admin` role in a single transaction.

  2. Security
    - Revokes execute from `public`/`anon`; only `authenticated` can call it.
    - Callers can only ever bootstrap their OWN user (auth.uid()) — the
      function never accepts a user id parameter.
*/

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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT org_id INTO v_existing_org FROM users WHERE id = v_uid;
  IF v_existing_org IS NOT NULL THEN
    RETURN v_existing_org;
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
