-- Enable live chat updates via Supabase Realtime (filtered INSERT subscriptions).

ALTER TABLE thread_messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE thread_messages;
