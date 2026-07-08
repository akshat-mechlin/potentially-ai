-- Add personal sender mode + domain verification fields for custom From addresses

ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_email_sender_mode_check;

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS sender_domain TEXT,
  ADD COLUMN IF NOT EXISTS sender_domain_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS resend_domain_id TEXT;

ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_email_sender_mode_check
    CHECK (email_sender_mode IN ('platform', 'personal', 'custom'));

ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_sender_domain_status_check
    CHECK (sender_domain_status IN ('not_started', 'pending', 'verified', 'failed'));

-- Existing custom rows may have unverified domains
UPDATE workspaces
SET sender_domain_status = 'not_started'
WHERE email_sender_mode = 'custom'
  AND sender_domain IS NULL
  AND sender_domain_status = 'not_started';
