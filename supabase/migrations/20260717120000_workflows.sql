-- Agent Mode visual workflows (React Flow graphs)

CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'archived');

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status workflow_status DEFAULT 'draft' NOT NULL,
  graph JSONB DEFAULT '{"nodes":[],"edges":[]}'::jsonb NOT NULL,
  segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
  playbook_id UUID REFERENCES playbooks(id) ON DELETE SET NULL,
  icp_profile JSONB DEFAULT '{}'::jsonb NOT NULL,
  matching_config JSONB DEFAULT '{}'::jsonb NOT NULL,
  send_config JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
CREATE INDEX idx_workflows_updated ON workflows(workspace_id, updated_at DESC);

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage workflows" ON workflows
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
