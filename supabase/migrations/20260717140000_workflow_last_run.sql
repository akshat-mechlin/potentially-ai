-- Persist last workflow execution summary

ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS last_run JSONB;
