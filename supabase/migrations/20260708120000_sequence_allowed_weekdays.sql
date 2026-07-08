-- Per-step weekday window for follow-up triggers (0=Sun … 6=Sat).
ALTER TABLE playbook_sequence_steps
  ADD COLUMN IF NOT EXISTS allowed_weekdays INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5];

COMMENT ON COLUMN playbook_sequence_steps.allowed_weekdays IS
  'Days of week (0=Sunday … 6=Saturday) when this follow-up may fire after delay_days.';
