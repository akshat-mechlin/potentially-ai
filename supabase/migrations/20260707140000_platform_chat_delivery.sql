-- Platform chat: deliver to Potentially users in-app, or via email when off-platform.

ALTER TABLE conversation_threads
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS initiator_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS initiator_display_name TEXT,
  ADD COLUMN IF NOT EXISTS initiator_workspace_name TEXT;

CREATE INDEX IF NOT EXISTS idx_conversation_threads_recipient
  ON conversation_threads(recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

-- Recipients can read threads addressed to them
CREATE POLICY "Recipients can view their threads" ON conversation_threads
  FOR SELECT USING (recipient_user_id = auth.uid());

CREATE POLICY "Recipients can update their thread activity" ON conversation_threads
  FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

CREATE POLICY "Recipients can view their thread messages" ON thread_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_threads t
      WHERE t.id = thread_messages.thread_id AND t.recipient_user_id = auth.uid()
    )
  );

CREATE POLICY "Recipients can reply in their threads" ON thread_messages
  FOR INSERT WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_threads t
      WHERE t.id = thread_messages.thread_id AND t.recipient_user_id = auth.uid()
    )
  );

-- Link existing threads when a profile is created with a matching contact email
CREATE OR REPLACE FUNCTION public.link_conversation_threads_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversation_threads ct
  SET recipient_user_id = NEW.id
  FROM contacts c
  WHERE ct.contact_id = c.id
    AND ct.recipient_user_id IS NULL
    AND c.email IS NOT NULL
    AND lower(trim(c.email)) = lower(trim(NEW.email));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_threads_on_profile_insert ON profiles;
CREATE TRIGGER link_threads_on_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_conversation_threads_for_profile();

-- Also link when profile email is updated
CREATE OR REPLACE FUNCTION public.link_conversation_threads_on_profile_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.email IS DISTINCT FROM OLD.email) THEN
    UPDATE conversation_threads ct
    SET recipient_user_id = NEW.id
    FROM contacts c
    WHERE ct.contact_id = c.id
      AND ct.recipient_user_id IS NULL
      AND c.email IS NOT NULL
      AND lower(trim(c.email)) = lower(trim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_threads_on_profile_email_update ON profiles;
CREATE TRIGGER link_threads_on_profile_email_update
  AFTER INSERT OR UPDATE OF email ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_conversation_threads_on_profile_email_update();
