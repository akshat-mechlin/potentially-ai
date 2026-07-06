-- Search contacts across multiple workspaces the user belongs to

CREATE OR REPLACE FUNCTION match_contacts_in_workspaces(
  query_embedding vector(1536),
  match_workspace_ids UUID[],
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  title TEXT,
  email TEXT,
  company_name TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.full_name,
    c.title,
    c.email,
    c.company_name,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM contacts c
  WHERE c.workspace_id = ANY(match_workspace_ids)
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

ALTER FUNCTION public.match_contacts_in_workspaces(vector, uuid[], float, int) SET search_path = public;
GRANT EXECUTE ON FUNCTION public.match_contacts_in_workspaces(vector, uuid[], double precision, integer) TO authenticated;
