-- pg_cron job: POST /api/cron/playbook-sequences hourly.
-- Requires vault secrets (set once in Supabase SQL editor):
--   SELECT vault.create_secret('<CRON_SECRET>', 'potentially_cron_secret', 'Bearer for playbook cron');
--   SELECT vault.create_secret('https://potentially.mechlintech.com', 'potentially_app_url', 'App URL for cron');

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.invoke_playbook_sequence_cron()
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
    url := rtrim(app_url, '/') || '/api/cron/playbook-sequences',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO request_id;
END;
$$;

REVOKE ALL ON FUNCTION private.invoke_playbook_sequence_cron() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.invoke_playbook_sequence_cron() TO postgres;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'potentially-playbook-sequences'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'potentially-playbook-sequences',
  '0 * * * *',
  $$SELECT private.invoke_playbook_sequence_cron();$$
);
