-- Chat hide (per-user inbox delete) + recipient can delete own messages

CREATE TABLE IF NOT EXISTS chat_hides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE CASCADE,
  run_contact_id UUID REFERENCES playbook_run_contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chat_hides_has_target CHECK (thread_id IS NOT NULL OR run_contact_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_hides_user_thread
  ON chat_hides (user_id, thread_id)
  WHERE thread_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_hides_user_run_contact
  ON chat_hides (user_id, run_contact_id)
  WHERE run_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_hides_user ON chat_hides (user_id);

ALTER TABLE chat_hides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat hides" ON chat_hides
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Recipients may delete their own messages (workspace members already have FOR ALL)
CREATE POLICY "Recipients can delete own thread messages" ON thread_messages
  FOR DELETE
  USING (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_threads t
      WHERE t.id = thread_messages.thread_id
        AND t.recipient_user_id = auth.uid()
    )
  );
