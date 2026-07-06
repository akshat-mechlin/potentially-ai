-- Reusable shareable invite link per workspace

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_invite_token
  ON workspaces (invite_token)
  WHERE invite_token IS NOT NULL;
