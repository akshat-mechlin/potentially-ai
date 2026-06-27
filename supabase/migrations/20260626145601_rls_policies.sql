-- Migration 3/5: Row Level Security policies
-- Applied to remote: yes

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Workspace members can view teammate profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
    )
  );

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace" ON workspaces
  FOR SELECT USING (is_workspace_member(id));

CREATE POLICY "Owners and admins can update workspace" ON workspaces
  FOR UPDATE USING (get_workspace_role(id) IN ('owner', 'admin'));

CREATE POLICY "Authenticated users can create workspace" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Owners and admins can manage members" ON workspace_members
  FOR ALL USING (get_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Users can join via invite" ON workspace_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invites" ON workspace_invites
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Owners and admins can create invites" ON workspace_invites
  FOR INSERT WITH CHECK (get_workspace_role(workspace_id) IN ('owner', 'admin'));

ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own connections" ON oauth_connections
  FOR ALL USING (auth.uid() = user_id AND is_workspace_member(workspace_id));

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view companies" ON companies
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can manage companies" ON companies
  FOR ALL USING (is_workspace_member(workspace_id) AND get_workspace_role(workspace_id) != 'viewer');

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contacts" ON contacts
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can manage contacts" ON contacts
  FOR ALL USING (is_workspace_member(workspace_id) AND get_workspace_role(workspace_id) != 'viewer');

ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view notes" ON contact_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_notes.contact_id AND is_workspace_member(c.workspace_id)
    )
  );

CREATE POLICY "Members can manage own notes" ON contact_notes
  FOR ALL USING (auth.uid() = author_id);

ALTER TABLE relationship_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view events" ON relationship_events
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create events" ON relationship_events
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

ALTER TABLE introductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view introductions" ON introductions
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can manage introductions" ON introductions
  FOR ALL USING (is_workspace_member(workspace_id) AND get_workspace_role(workspace_id) != 'viewer');

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history" ON search_history
  FOR SELECT USING (auth.uid() = user_id AND is_workspace_member(workspace_id));

CREATE POLICY "Users can create search history" ON search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_workspace_member(workspace_id));

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id AND is_workspace_member(workspace_id));

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view activities" ON activities
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "System can insert activities" ON activities
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync jobs" ON sync_jobs
  FOR SELECT USING (auth.uid() = user_id AND is_workspace_member(workspace_id));

CREATE POLICY "Users can create sync jobs" ON sync_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_workspace_member(workspace_id));

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flags" ON feature_flags
  FOR SELECT USING (true);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace AI usage" ON ai_usage
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Users can log AI usage" ON ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_workspace_member(workspace_id));

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can view all workspaces" ON workspaces
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage feature flags" ON feature_flags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
