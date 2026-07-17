-- Outlook Email connector persists contacts with source = outlook_mail.
-- App types already include this value; add it to the Postgres enum.

ALTER TYPE sync_source ADD VALUE IF NOT EXISTS 'outlook_mail';
