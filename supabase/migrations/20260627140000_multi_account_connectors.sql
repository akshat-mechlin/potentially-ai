-- Allow multiple connected accounts per connector type

ALTER TABLE data_connectors
  ADD COLUMN IF NOT EXISTS account_email TEXT,
  ADD COLUMN IF NOT EXISTS account_label TEXT;

ALTER TABLE data_connectors
  DROP CONSTRAINT IF EXISTS data_connectors_user_id_workspace_id_connector_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS data_connectors_oauth_account_unique
  ON data_connectors (user_id, workspace_id, connector_key, provider_account_id)
  WHERE provider_account_id IS NOT NULL;

-- Supabase upsert support
ALTER TABLE data_connectors
  DROP CONSTRAINT IF EXISTS data_connectors_account_unique;

ALTER TABLE data_connectors
  ADD CONSTRAINT data_connectors_account_unique
  UNIQUE (user_id, workspace_id, connector_key, provider_account_id);
