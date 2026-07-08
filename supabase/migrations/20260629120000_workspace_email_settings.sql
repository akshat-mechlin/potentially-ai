-- Per-workspace outbound email sender configuration (platform vs custom)

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS email_sender_mode TEXT NOT NULL DEFAULT 'platform'
    CHECK (email_sender_mode IN ('platform', 'custom')),
  ADD COLUMN IF NOT EXISTS custom_sender_name TEXT,
  ADD COLUMN IF NOT EXISTS custom_sender_email TEXT;
