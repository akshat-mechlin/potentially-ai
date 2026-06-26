-- Seed data for development and demo
-- Note: Run after creating a test user via auth

-- Feature flags
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('ai_search', true, 'Enable AI-powered search'),
  ('graph_view', true, 'Enable network graph visualization'),
  ('outreach_engine', true, 'Enable AI outreach generation'),
  ('google_sync', true, 'Enable Google contacts/calendar sync'),
  ('outlook_sync', true, 'Enable Outlook sync'),
  ('csv_import', true, 'Enable CSV contact import'),
  ('team_collaboration', true, 'Enable team features'),
  ('analytics', true, 'Enable analytics dashboard');

-- Demo workspace (requires manual user association)
-- This seed script is meant to be run via scripts/seed.ts with service role
