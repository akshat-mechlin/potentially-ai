-- Chat thread message file attachments (private storage)

CREATE TABLE IF NOT EXISTS public.thread_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.thread_messages(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size integer NOT NULL CHECK (file_size > 0),
  mime_type text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS thread_message_attachments_thread_id_idx
  ON public.thread_message_attachments(thread_id);
CREATE INDEX IF NOT EXISTS thread_message_attachments_message_id_idx
  ON public.thread_message_attachments(message_id);

ALTER TABLE public.thread_message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS thread_message_attachments_select ON public.thread_message_attachments;
CREATE POLICY thread_message_attachments_select ON public.thread_message_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_threads t
      WHERE t.id = thread_id
        AND (
          public.is_workspace_member(t.workspace_id)
          OR t.recipient_user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS thread_message_attachments_insert ON public.thread_message_attachments;
CREATE POLICY thread_message_attachments_insert ON public.thread_message_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.thread_messages m
      JOIN public.conversation_threads t ON t.id = m.thread_id
      WHERE m.id = message_id
        AND m.thread_id = thread_id
        AND m.sender_user_id = auth.uid()
        AND (
          public.is_workspace_member(t.workspace_id)
          OR t.recipient_user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS thread_message_attachments_delete ON public.thread_message_attachments;
CREATE POLICY thread_message_attachments_delete ON public.thread_message_attachments
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  26214400,
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
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/x-wav'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.can_access_thread_attachment_path(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_threads t
    WHERE t.id::text = (storage.foldername(object_name))[1]
      AND (
        public.is_workspace_member(t.workspace_id)
        OR t.recipient_user_id = auth.uid()
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_thread_attachment_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_thread_attachment_path(text) TO authenticated;

DROP POLICY IF EXISTS "Chat attachments readable by thread parties" ON storage.objects;
CREATE POLICY "Chat attachments readable by thread parties"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.can_access_thread_attachment_path(name)
);

DROP POLICY IF EXISTS "Chat attachments upload by thread parties" ON storage.objects;
CREATE POLICY "Chat attachments upload by thread parties"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND public.can_access_thread_attachment_path(name)
);

DROP POLICY IF EXISTS "Chat attachments delete by thread parties" ON storage.objects;
CREATE POLICY "Chat attachments delete by thread parties"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.can_access_thread_attachment_path(name)
);
