-- Flexible connector storage for the Connector Dashboard

CREATE TABLE IF NOT EXISTS data_connectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connector_key TEXT NOT NULL,
  status connection_status DEFAULT 'pending',
  access_token TEXT,
  refresh_token TEXT,
  provider_account_id TEXT,
  last_synced_at TIMESTAMPTZ,
  records_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, workspace_id, connector_key)
);

CREATE INDEX IF NOT EXISTS idx_data_connectors_user ON data_connectors(user_id);
CREATE INDEX IF NOT EXISTS idx_data_connectors_workspace ON data_connectors(workspace_id);

ALTER TABLE data_connectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own connectors" ON data_connectors;
CREATE POLICY "Users manage own connectors" ON data_connectors
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS data_connectors_updated_at ON data_connectors;
CREATE TRIGGER data_connectors_updated_at
  BEFORE UPDATE ON data_connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
