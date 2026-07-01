/*
  # Revoke public execute on SECURITY DEFINER functions

  handle_new_auth_user() is a trigger-only function — it must never be
  callable via PostgREST (/rest/v1/rpc/handle_new_auth_user).

  bootstrap_org_and_user() is intentionally exposed to authenticated callers
  (onboarding flow), but must not be callable by anon. Migration 030 already
  grants to authenticated, but we re-assert the full permission set here to
  close any default-grant gap.
*/

-- handle_new_auth_user: no role should be able to call this directly
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM authenticated;

-- bootstrap_org_and_user: only authenticated (already granted in 030, re-assert)
REVOKE EXECUTE ON FUNCTION public.bootstrap_org_and_user(text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.bootstrap_org_and_user(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_org_and_user(text, text) TO authenticated;
