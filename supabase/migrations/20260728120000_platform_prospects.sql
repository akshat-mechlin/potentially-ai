-- Global Potentially prospect database (deduped by Apollo ID)

CREATE TABLE platform_prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apollo_id TEXT NOT NULL UNIQUE,
  record_type apollo_record_type NOT NULL DEFAULT 'person',
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  location TEXT,
  linkedin_url TEXT,
  primary_domain TEXT,
  enrichment_status TEXT NOT NULL DEFAULT 'none',
  enriched_at TIMESTAMPTZ,
  raw_apollo JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_hit_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX platform_prospects_apollo_id_idx ON platform_prospects (apollo_id);
CREATE INDEX platform_prospects_enrichment_status_idx ON platform_prospects (enrichment_status);
CREATE INDEX platform_prospects_last_seen_idx ON platform_prospects (last_seen_at DESC);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS platform_prospect_id UUID REFERENCES platform_prospects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS contacts_platform_prospect_id_idx ON contacts (platform_prospect_id) WHERE platform_prospect_id IS NOT NULL;

ALTER TABLE platform_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view platform prospects" ON platform_prospects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert platform prospects" ON platform_prospects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update platform prospects" ON platform_prospects
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Migrate from workspace-scoped apollo_records when present
INSERT INTO platform_prospects (
  apollo_id,
  record_type,
  name,
  title,
  email,
  phone,
  company_name,
  location,
  linkedin_url,
  primary_domain,
  enrichment_status,
  enriched_at,
  raw_apollo,
  metadata,
  first_seen_at,
  last_seen_at,
  search_hit_count
)
SELECT DISTINCT ON (apollo_id)
  apollo_id,
  record_type,
  name,
  title,
  email,
  phone,
  company_name,
  location,
  linkedin_url,
  primary_domain,
  enrichment_status,
  enriched_at,
  raw_apollo,
  metadata,
  created_at,
  updated_at,
  1
FROM apollo_records
WHERE apollo_id NOT LIKE 'contact:%'
  AND apollo_id NOT LIKE 'stub:%'
  AND apollo_id NOT LIKE 'email:%'
  AND apollo_id NOT LIKE 'linkedin:%'
  AND apollo_id NOT LIKE 'domain:%'
  AND apollo_id NOT LIKE 'name:%'
ORDER BY apollo_id, enriched_at DESC NULLS LAST, updated_at DESC
ON CONFLICT (apollo_id) DO UPDATE SET
  title = COALESCE(EXCLUDED.title, platform_prospects.title),
  email = COALESCE(EXCLUDED.email, platform_prospects.email),
  phone = COALESCE(EXCLUDED.phone, platform_prospects.phone),
  company_name = COALESCE(EXCLUDED.company_name, platform_prospects.company_name),
  location = COALESCE(EXCLUDED.location, platform_prospects.location),
  linkedin_url = COALESCE(EXCLUDED.linkedin_url, platform_prospects.linkedin_url),
  primary_domain = COALESCE(EXCLUDED.primary_domain, platform_prospects.primary_domain),
  enrichment_status = CASE
    WHEN platform_prospects.enrichment_status = 'enriched' THEN platform_prospects.enrichment_status
    ELSE EXCLUDED.enrichment_status
  END,
  enriched_at = COALESCE(platform_prospects.enriched_at, EXCLUDED.enriched_at),
  raw_apollo = CASE
    WHEN platform_prospects.enrichment_status = 'enriched' THEN platform_prospects.raw_apollo
    ELSE EXCLUDED.raw_apollo
  END,
  updated_at = GREATEST(platform_prospects.updated_at, EXCLUDED.updated_at);

UPDATE contacts c
SET platform_prospect_id = pp.id
FROM apollo_records ar
JOIN platform_prospects pp ON pp.apollo_id = ar.apollo_id
WHERE ar.contact_id = c.id
  AND c.platform_prospect_id IS NULL;

DROP TABLE IF EXISTS apollo_records;
