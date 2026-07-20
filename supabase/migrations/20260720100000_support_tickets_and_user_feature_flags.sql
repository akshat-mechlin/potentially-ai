-- Support ticketing + per-user feature flag overrides
-- Applied via Supabase MCP; kept in repo for local parity.

DO $$ BEGIN
  CREATE TYPE public.support_ticket_status AS ENUM ('open', 'in_progress', 'waiting_on_user', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.support_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  priority public.support_ticket_priority NOT NULL DEFAULT 'medium',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_staff boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_feature_flags (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_key text NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, flag_key)
);

CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_assigned_admin_id_idx ON public.support_tickets(assigned_admin_id);
CREATE INDEX IF NOT EXISTS support_tickets_last_message_at_idx ON public.support_tickets(last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_id_idx ON public.support_ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS user_feature_flags_flag_key_idx ON public.user_feature_flags(flag_key);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_select ON public.support_tickets;
CREATE POLICY support_tickets_select ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS support_tickets_insert ON public.support_tickets;
CREATE POLICY support_tickets_insert ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS support_tickets_update ON public.support_tickets;
CREATE POLICY support_tickets_update ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS support_tickets_delete ON public.support_tickets;
CREATE POLICY support_tickets_delete ON public.support_tickets
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS support_ticket_messages_select ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_select ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS support_ticket_messages_insert ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_insert ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          (t.user_id = auth.uid() AND is_staff = false)
          OR public.is_admin()
        )
    )
  );

DROP POLICY IF EXISTS user_feature_flags_select ON public.user_feature_flags;
CREATE POLICY user_feature_flags_select ON public.user_feature_flags
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS user_feature_flags_admin_all ON public.user_feature_flags;
CREATE POLICY user_feature_flags_admin_all ON public.user_feature_flags
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('ai_search', true, 'AI Search — natural language search across your network'),
  ('graph_view', true, 'Network Graph — interactive relationship visualization'),
  ('outreach_engine', true, 'Outreach Engine — AI emails, LinkedIn messages, and intro requests'),
  ('team_collaboration', true, 'Team Collaboration — groups, invites, and member roles'),
  ('beta_connectors', true, 'Beta Connectors — early-access connector integrations'),
  ('billing_enforcement', true, 'Billing Enforcement — plan limits on search, imports, and usage'),
  ('playbook_mode', true, 'Playbooks (Agent Mode) — playbooks, runs, sequences, and segments'),
  ('platform_chat', true, 'Platform Chat — realtime prospect conversation UI'),
  ('analytics', true, 'Analytics — workspace analytics dashboard and insights'),
  ('csv_import', true, 'CSV Import — upload contacts from CSV / spreadsheets'),
  ('google_sync', true, 'Google Sync — Google Contacts, Calendar, and Gmail'),
  ('outlook_sync', true, 'Outlook Sync — Outlook contacts and mail'),
  ('support_ticketing', true, 'Support Ticketing — in-app support tickets under Resources')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.touch_support_ticket_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_tickets_touch_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_touch_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket_updated_at();
