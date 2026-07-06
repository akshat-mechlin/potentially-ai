-- Playbooks (Agent Mode), Segments, outreach pipeline

CREATE TYPE playbook_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE automation_level AS ENUM ('assist', 'supervised', 'autonomous');
CREATE TYPE outreach_mode AS ENUM ('warm_preferred', 'warm_required', 'cold_allowed');
CREATE TYPE playbook_run_status AS ENUM (
  'pending', 'matching', 'review', 'finalized', 'executing', 'completed', 'failed', 'cancelled'
);
CREATE TYPE playbook_prospect_status AS ENUM (
  'matched', 'selected', 'queued', 'pending_approval', 'sent', 'replied', 'booked', 'opted_out', 'failed', 'skipped'
);
CREATE TYPE outbound_channel AS ENUM ('email', 'in_app', 'linkedin');
CREATE TYPE outbound_message_status AS ENUM ('draft', 'pending_approval', 'queued', 'sent', 'failed', 'cancelled');

CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'manual',
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE segment_contacts (
  segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (segment_id, contact_id)
);

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status playbook_status DEFAULT 'draft' NOT NULL,
  automation_level automation_level DEFAULT 'assist' NOT NULL,
  outreach_mode outreach_mode DEFAULT 'warm_preferred' NOT NULL,
  goal TEXT,
  tone TEXT DEFAULT 'professional',
  icp_profile JSONB DEFAULT '{}'::jsonb NOT NULL,
  matching_config JSONB DEFAULT '{}'::jsonb NOT NULL,
  send_config JSONB DEFAULT '{}'::jsonb NOT NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE playbook_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  triggered_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
  status playbook_run_status DEFAULT 'pending' NOT NULL,
  icp_snapshot JSONB DEFAULT '{}'::jsonb NOT NULL,
  stats JSONB DEFAULT '{}'::jsonb NOT NULL,
  dry_run BOOLEAN DEFAULT FALSE NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE playbook_run_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES playbook_runs(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  match_score INTEGER DEFAULT 0 NOT NULL,
  match_reason TEXT,
  matched_signals JSONB DEFAULT '[]'::jsonb NOT NULL,
  warm_path JSONB DEFAULT '[]'::jsonb NOT NULL,
  status playbook_prospect_status DEFAULT 'matched' NOT NULL,
  draft_subject TEXT,
  draft_body TEXT,
  skip_reason TEXT,
  last_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (run_id, contact_id)
);

CREATE TABLE contact_preferences (
  contact_id UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  unsubscribed_at TIMESTAMPTZ,
  do_not_contact BOOLEAN DEFAULT FALSE NOT NULL,
  bounce_count INTEGER DEFAULT 0 NOT NULL,
  last_contacted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE outbound_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES playbook_runs(id) ON DELETE SET NULL,
  run_contact_id UUID REFERENCES playbook_run_contacts(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel outbound_channel DEFAULT 'email' NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status outbound_message_status DEFAULT 'draft' NOT NULL,
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE conversation_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_contact_id UUID REFERENCES playbook_run_contacts(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  participant_user_ids UUID[] DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE thread_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_segments_workspace ON segments(workspace_id);
CREATE INDEX idx_playbooks_workspace ON playbooks(workspace_id);
CREATE INDEX idx_playbook_runs_playbook ON playbook_runs(playbook_id);
CREATE INDEX idx_playbook_run_contacts_run ON playbook_run_contacts(run_id);
CREATE INDEX idx_outbound_messages_contact ON outbound_messages(contact_id);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id, created_at DESC);

-- RLS
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_run_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage segments" ON segments
  FOR ALL USING (is_workspace_member(workspace_id) AND get_workspace_role(workspace_id) != 'viewer');

CREATE POLICY "Members manage segment contacts" ON segment_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM segments s
      WHERE s.id = segment_contacts.segment_id AND is_workspace_member(s.workspace_id)
    )
  );

CREATE POLICY "Members manage templates" ON email_templates
  FOR ALL USING (is_workspace_member(workspace_id) AND get_workspace_role(workspace_id) != 'viewer');

CREATE POLICY "Members manage playbooks" ON playbooks
  FOR ALL USING (is_workspace_member(workspace_id) AND get_workspace_role(workspace_id) != 'viewer');

CREATE POLICY "Members manage playbook runs" ON playbook_runs
  FOR ALL USING (is_workspace_member(workspace_id) AND get_workspace_role(workspace_id) != 'viewer');

CREATE POLICY "Members manage run contacts" ON playbook_run_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playbook_runs r
      WHERE r.id = playbook_run_contacts.run_id AND is_workspace_member(r.workspace_id)
    )
  );

CREATE POLICY "Members view contact preferences" ON contact_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_preferences.contact_id AND is_workspace_member(c.workspace_id)
    )
  );

CREATE POLICY "Members manage outbound messages" ON outbound_messages
  FOR ALL USING (is_workspace_member(workspace_id) AND get_workspace_role(workspace_id) != 'viewer');

CREATE POLICY "Members view audit logs" ON audit_logs
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members manage threads" ON conversation_threads
  FOR ALL USING (is_workspace_member(workspace_id));

CREATE POLICY "Members manage thread messages" ON thread_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversation_threads t
      WHERE t.id = thread_messages.thread_id AND is_workspace_member(t.workspace_id)
    )
  );

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('playbook_mode', true, 'Enable Playbooks outreach pipeline'),
  ('platform_chat', false, 'Enable realtime platform chat in prospect view')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
