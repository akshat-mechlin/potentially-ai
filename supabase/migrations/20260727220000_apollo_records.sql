-- Apollo tab: workspace-scoped saved search/enrichment records (separate from contacts)

CREATE TYPE apollo_record_type AS ENUM ('person', 'organization');

CREATE TABLE apollo_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  saved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  record_type apollo_record_type NOT NULL,
  apollo_id TEXT NOT NULL,
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
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  imported_to_contacts_at TIMESTAMPTZ,
  saved_from TEXT,
  raw_apollo JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, record_type, apollo_id)
);

CREATE INDEX apollo_records_workspace_type_idx ON apollo_records (workspace_id, record_type);
CREATE INDEX apollo_records_workspace_created_idx ON apollo_records (workspace_id, created_at DESC);
CREATE INDEX apollo_records_contact_id_idx ON apollo_records (contact_id) WHERE contact_id IS NOT NULL;

ALTER TABLE apollo_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view apollo records" ON apollo_records
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can manage apollo records" ON apollo_records
  FOR ALL USING (
    is_workspace_member(workspace_id) AND get_workspace_role(workspace_id) != 'viewer'
  );

-- Backfill from existing Apollo-sourced contacts
INSERT INTO apollo_records (
  workspace_id,
  record_type,
  apollo_id,
  name,
  title,
  email,
  phone,
  company_name,
  location,
  linkedin_url,
  contact_id,
  imported_to_contacts_at,
  saved_from,
  enrichment_status,
  raw_apollo,
  metadata
)
SELECT
  c.workspace_id,
  'person'::apollo_record_type,
  COALESCE(
    NULLIF(REPLACE(c.external_id, 'apollo:', ''), ''),
    'contact:' || c.id::text
  ),
  c.full_name,
  c.title,
  c.email,
  c.phone,
  c.company_name,
  c.location,
  c.linkedin_url,
  c.id,
  c.created_at,
  'backfill',
  'none',
  COALESCE(c.metadata, '{}'::jsonb),
  jsonb_build_object('backfilled_from_contact', true)
FROM contacts c
WHERE c.source = 'apollo'
ON CONFLICT (workspace_id, record_type, apollo_id) DO NOTHING;
