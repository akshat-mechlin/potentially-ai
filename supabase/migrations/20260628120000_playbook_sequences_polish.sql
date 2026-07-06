-- Sequences, prospect polish, Calendly, reply tracking

ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS calendly_url TEXT;

ALTER TABLE playbook_run_contacts
  ADD COLUMN IF NOT EXISTS current_sequence_step INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calendly_booked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS playbook_sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0 NOT NULL,
  tone TEXT DEFAULT 'professional',
  goal_override TEXT,
  subject_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (playbook_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_sequence_steps_playbook ON playbook_sequence_steps(playbook_id, step_order);
CREATE INDEX IF NOT EXISTS idx_run_contacts_next_action ON playbook_run_contacts(next_action_at)
  WHERE next_action_at IS NOT NULL;

ALTER TABLE playbook_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage sequence steps" ON playbook_sequence_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playbooks p
      WHERE p.id = playbook_sequence_steps.playbook_id
        AND is_workspace_member(p.workspace_id)
        AND get_workspace_role(p.workspace_id) != 'viewer'
    )
  );

CREATE POLICY "Members update contact preferences" ON contact_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_preferences.contact_id AND is_workspace_member(c.workspace_id)
    )
  );
