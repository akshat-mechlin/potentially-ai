-- Migration 4/5: Harden function grants and search_path
-- Applied to remote: yes

REVOKE ALL ON FUNCTION public.get_workspace_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_role(uuid) TO authenticated;

ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.match_contacts(vector, uuid, float, int) SET search_path = public;
ALTER FUNCTION public.is_workspace_member(uuid) SET search_path = public;
ALTER FUNCTION public.get_workspace_role(uuid) SET search_path = public;
