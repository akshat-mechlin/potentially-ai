-- Default workspace on signup, vector index, and feature flag seeds

CREATE INDEX IF NOT EXISTS idx_contacts_embedding
  ON contacts USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.create_default_workspace_for_user(p_user_id uuid, p_name text)
RETURNS workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace workspaces;
  base_slug text;
  final_slug text;
  suffix int := 0;
BEGIN
  base_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN
    base_slug := 'workspace';
  END IF;
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM workspaces WHERE slug = final_slug) LOOP
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix;
  END LOOP;

  INSERT INTO workspaces (name, slug)
  VALUES (p_name, final_slug)
  RETURNING * INTO new_workspace;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace.id, p_user_id, 'owner');

  RETURN new_workspace;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name text;
BEGIN
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    display_name,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  PERFORM public.create_default_workspace_for_user(NEW.id, display_name || '''s Workspace');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('ai_search', true, 'Enable AI-powered network search'),
  ('graph_view', true, 'Enable relationship graph visualization'),
  ('outreach_engine', true, 'Enable AI outreach generation'),
  ('team_collaboration', true, 'Enable team invites and shared workspaces')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Users can create own notifications" ON notifications;
CREATE POLICY "Users can create own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
