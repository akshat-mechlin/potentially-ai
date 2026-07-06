-- Stripe billing columns + additional feature flags

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_subscription
  ON workspaces (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('beta_connectors', false, 'Enable beta connector integrations'),
  ('billing_enforcement', true, 'Enforce plan limits on search and imports')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description;

-- Use "Group" naming for auto-created default groups
CREATE OR REPLACE FUNCTION public.ensure_user_onboarded()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  display_name text;
  new_workspace workspaces;
  existing_ws uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT wm.workspace_id INTO existing_ws
  FROM workspace_members wm
  WHERE wm.user_id = uid
  ORDER BY wm.joined_at
  LIMIT 1;

  IF existing_ws IS NOT NULL THEN
    RETURN existing_ws;
  END IF;

  SELECT COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(COALESCE(u.email, 'user'), '@', 1),
    'My'
  )
  INTO display_name
  FROM auth.users u
  WHERE u.id = uid;

  INSERT INTO profiles (id, email, name, avatar_url)
  SELECT
    u.id,
    COALESCE(u.email, ''),
    display_name,
    u.raw_user_meta_data->>'avatar_url'
  FROM auth.users u
  WHERE u.id = uid
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO new_workspace
  FROM public.create_default_workspace_for_user(uid, display_name || '''s Group');

  RETURN new_workspace.id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_onboarded() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_onboarded() TO authenticated;
