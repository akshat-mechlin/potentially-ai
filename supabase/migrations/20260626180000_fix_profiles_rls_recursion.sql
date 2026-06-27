-- Fix infinite recursion in profiles RLS (admin policies queried profiles from within profiles policies)
-- Add atomic workspace creation RPC

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all workspaces" ON workspaces;
CREATE POLICY "Admins can view all workspaces" ON workspaces
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage feature flags" ON feature_flags;
CREATE POLICY "Admins can manage feature flags" ON feature_flags
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(workspace_name text)
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  base_slug := lower(regexp_replace(trim(workspace_name), '[^a-zA-Z0-9]+', '-', 'g'));
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
  VALUES (workspace_name, final_slug)
  RETURNING * INTO new_workspace;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace.id, auth.uid(), 'owner');

  RETURN new_workspace;
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace_with_owner(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner(text) TO authenticated;

ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.create_workspace_with_owner(text) SET search_path = public;
