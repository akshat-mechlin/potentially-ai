-- Workspace member counts RPC for listUserWorkspaces

CREATE OR REPLACE FUNCTION get_workspace_member_counts(p_workspace_ids uuid[])
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(workspace_id::text, member_count),
    '{}'::jsonb
  )
  FROM (
    SELECT workspace_id, count(*)::int AS member_count
    FROM workspace_members
    WHERE workspace_id = ANY(p_workspace_ids)
    GROUP BY workspace_id
  ) counts;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_member_counts(uuid[]) TO authenticated;
