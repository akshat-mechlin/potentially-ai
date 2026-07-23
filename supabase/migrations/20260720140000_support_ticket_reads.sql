-- Per-user last-read tracking for support ticket unread badges
-- Applied via Supabase MCP; kept in repo for local parity.

CREATE TABLE IF NOT EXISTS public.support_ticket_reads (
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS support_ticket_reads_user_id_idx
  ON public.support_ticket_reads(user_id);

ALTER TABLE public.support_ticket_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_ticket_reads_select ON public.support_ticket_reads;
CREATE POLICY support_ticket_reads_select ON public.support_ticket_reads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS support_ticket_reads_insert ON public.support_ticket_reads;
CREATE POLICY support_ticket_reads_insert ON public.support_ticket_reads
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS support_ticket_reads_update ON public.support_ticket_reads;
CREATE POLICY support_ticket_reads_update ON public.support_ticket_reads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.support_unread_message_count(p_user_id uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.support_ticket_messages m
  JOIN public.support_tickets t ON t.id = m.ticket_id
  LEFT JOIN public.support_ticket_reads r
    ON r.ticket_id = t.id AND r.user_id = p_user_id
  WHERE m.author_id <> p_user_id
    AND m.created_at > COALESCE(r.last_read_at, '1970-01-01'::timestamptz)
    AND (
      t.user_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = p_user_id AND p.is_admin = true
      )
    );
$$;

REVOKE ALL ON FUNCTION public.support_unread_message_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_unread_message_count(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_support_ticket_read(p_ticket_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = p_ticket_id
      AND (
        t.user_id = p_user_id
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id AND p.is_admin = true)
      )
  ) THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  INSERT INTO public.support_ticket_reads (ticket_id, user_id, last_read_at)
  VALUES (p_ticket_id, p_user_id, now())
  ON CONFLICT (ticket_id, user_id)
  DO UPDATE SET last_read_at = EXCLUDED.last_read_at;

  UPDATE public.notifications n
  SET read = true
  WHERE n.user_id = p_user_id
    AND n.read = false
    AND n.type = 'support_ticket'
    AND n.link ILIKE '%' || p_ticket_id::text || '%';
END;
$$;

REVOKE ALL ON FUNCTION public.mark_support_ticket_read(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_support_ticket_read(uuid, uuid) TO authenticated;
