-- Opt-in daily auto-sync for connector accounts.

ALTER TABLE data_connectors
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_data_connectors_auto_sync_due
  ON data_connectors (status, auto_sync_enabled, last_synced_at)
  WHERE auto_sync_enabled = true AND status = 'active';

-- Daily cron: POST /api/cron/connector-auto-sync
-- Reuses vault secrets potentially_cron_secret + potentially_app_url (same as playbook cron).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.invoke_connector_auto_sync_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault, pg_temp
AS $$
DECLARE
  cron_secret text;
  app_url text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'potentially_cron_secret'
  LIMIT 1;

  SELECT decrypted_secret INTO app_url
  FROM vault.decrypted_secrets
  WHERE name = 'potentially_app_url'
  LIMIT 1;

  IF cron_secret IS NULL OR btrim(cron_secret) = '' THEN
    RAISE WARNING 'potentially_cron_secret not configured in vault';
    RETURN;
  END IF;

  IF app_url IS NULL OR btrim(app_url) = '' THEN
    app_url := 'https://potentially.mechlintech.com';
  END IF;

  SELECT net.http_post(
    url := rtrim(app_url, '/') || '/api/cron/connector-auto-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) INTO request_id;
END;
$$;

REVOKE ALL ON FUNCTION private.invoke_connector_auto_sync_cron() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.invoke_connector_auto_sync_cron() TO postgres;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'potentially-connector-auto-sync'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'potentially-connector-auto-sync',
  '0 3 * * *',
  $$SELECT private.invoke_connector_auto_sync_cron();$$
);
