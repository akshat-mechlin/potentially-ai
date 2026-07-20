-- Support ticket file attachments (private storage)
-- Applied via Supabase MCP; kept in repo for local parity.

CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size integer NOT NULL CHECK (file_size > 0),
  mime_type text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ticket_attachments_ticket_id_idx
  ON public.support_ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS support_ticket_attachments_message_id_idx
  ON public.support_ticket_attachments(message_id);

ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_ticket_attachments_select ON public.support_ticket_attachments;
CREATE POLICY support_ticket_attachments_select ON public.support_ticket_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS support_ticket_attachments_insert ON public.support_ticket_attachments;
CREATE POLICY support_ticket_attachments_insert ON public.support_ticket_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.user_id = auth.uid()
          OR public.is_admin()
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.support_ticket_messages m
      WHERE m.id = message_id AND m.ticket_id = ticket_id AND m.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS support_ticket_attachments_delete ON public.support_ticket_attachments;
CREATE POLICY support_ticket_attachments_delete ON public.support_ticket_attachments
  FOR DELETE TO authenticated
  USING (public.is_admin() OR uploaded_by = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.can_access_support_attachment_path(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id::text = (storage.foldername(object_name))[1]
      AND (t.user_id = auth.uid() OR public.is_admin())
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_support_attachment_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_support_attachment_path(text) TO authenticated;

DROP POLICY IF EXISTS "Support attachments readable by ticket parties" ON storage.objects;
CREATE POLICY "Support attachments readable by ticket parties"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND public.can_access_support_attachment_path(name)
);

DROP POLICY IF EXISTS "Support attachments upload by ticket parties" ON storage.objects;
CREATE POLICY "Support attachments upload by ticket parties"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND public.can_access_support_attachment_path(name)
);

DROP POLICY IF EXISTS "Support attachments delete by ticket parties" ON storage.objects;
CREATE POLICY "Support attachments delete by ticket parties"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND public.can_access_support_attachment_path(name)
);
