-- Revoke broad execute on internal/security-definer functions
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
-- claim_first_admin must remain callable by signed-in users (one-time bootstrap)
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- has_role: only signed-in users need to evaluate it (used in RLS policies); revoke from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;