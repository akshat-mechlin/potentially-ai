-- Restore EXECUTE on RLS helper functions for authenticated users.
-- harden_function_grants revoked these, which broke every policy that calls them.

GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_contacts(vector, uuid, double precision, integer) TO authenticated;
