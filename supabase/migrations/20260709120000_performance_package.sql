-- Performance package: dashboard stats RPC, notification realtime, missing FK indexes

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id uuid, p_workspace_ids uuid[])
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'contacts_indexed', COALESCE((
      SELECT count(*)::int FROM contacts
      WHERE workspace_id = ANY(p_workspace_ids)
    ), 0),
    'recent_searches', COALESCE((
      SELECT count(*)::int FROM search_history
      WHERE user_id = p_user_id
    ), 0),
    'introductions_success', COALESCE((
      SELECT count(*)::int FROM introductions
      WHERE status = 'completed'
        AND workspace_id = ANY(p_workspace_ids)
    ), 0)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid, uuid[]) TO authenticated;

ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

CREATE INDEX IF NOT EXISTS idx_workspace_members_invited_by ON workspace_members(invited_by);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_invited_by ON workspace_invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace ON workspace_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_author ON contact_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_relationship_events_user ON relationship_events(user_id);
CREATE INDEX IF NOT EXISTS idx_introductions_connector ON introductions(connector_id);
CREATE INDEX IF NOT EXISTS idx_introductions_requester ON introductions(requester_id);
CREATE INDEX IF NOT EXISTS idx_introductions_target_contact ON introductions(target_contact_id);
CREATE INDEX IF NOT EXISTS idx_introductions_workspace ON introductions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_workspace ON saved_searches(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_connection ON sync_jobs(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user ON sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace ON ai_usage(workspace_id);
CREATE INDEX IF NOT EXISTS idx_segments_created_by ON segments(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_workspace ON email_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_created_by ON playbooks(created_by);
CREATE INDEX IF NOT EXISTS idx_playbooks_template ON playbooks(template_id);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_segment ON playbook_runs(segment_id);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_triggered_by ON playbook_runs(triggered_by);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_workspace ON playbook_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_run_contact ON outbound_messages(run_contact_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_run ON outbound_messages(run_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_workspace ON outbound_messages(workspace_id);
