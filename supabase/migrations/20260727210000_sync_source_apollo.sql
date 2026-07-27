-- Track contacts imported or enriched via Apollo connector

ALTER TYPE sync_source ADD VALUE IF NOT EXISTS 'apollo';
