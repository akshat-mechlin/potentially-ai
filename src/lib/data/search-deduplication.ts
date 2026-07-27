import type { SearchResultContact } from "@/types";

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeCompany(company: string | null | undefined): string {
  return (company ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function nameCompanyKey(
  name: string | null | undefined,
  company: string | null | undefined,
): string | null {
  const normalizedName = normalizeName(name);
  const normalizedCompany = normalizeCompany(company);
  if (!normalizedName) return null;
  return `${normalizedName}|${normalizedCompany}`;
}

function enrichWorkspaceFromApollo(
  workspace: SearchResultContact,
  apollo: SearchResultContact,
): SearchResultContact {
  return {
    ...workspace,
    email: workspace.email ?? apollo.email,
    title: workspace.title ?? apollo.title,
    company_name: workspace.company_name ?? apollo.company_name,
    platform_prospect_id: workspace.platform_prospect_id ?? apollo.platform_prospect_id,
    apollo_id: workspace.apollo_id ?? apollo.apollo_id,
    enrichment_status: workspace.enrichment_status ?? apollo.enrichment_status,
    source: "workspace",
  };
}

function isDuplicate(
  apollo: SearchResultContact,
  indexes: {
    byId: Map<string, SearchResultContact>;
    byEmail: Map<string, SearchResultContact>;
    byApolloId: Map<string, SearchResultContact>;
    byProspectId: Map<string, SearchResultContact>;
    byNameCompany: Map<string, SearchResultContact>;
  },
): SearchResultContact | null {
  if (indexes.byId.has(apollo.id)) {
    return indexes.byId.get(apollo.id)!;
  }

  const email = normalizeEmail(apollo.email);
  if (email && indexes.byEmail.has(email)) {
    return indexes.byEmail.get(email)!;
  }

  if (apollo.apollo_id && indexes.byApolloId.has(apollo.apollo_id)) {
    return indexes.byApolloId.get(apollo.apollo_id)!;
  }

  if (apollo.platform_prospect_id && indexes.byProspectId.has(apollo.platform_prospect_id)) {
    return indexes.byProspectId.get(apollo.platform_prospect_id)!;
  }

  const key = nameCompanyKey(apollo.full_name, apollo.company_name);
  if (key && indexes.byNameCompany.has(key)) {
    return indexes.byNameCompany.get(key)!;
  }

  return null;
}

/**
 * Merge Apollo and workspace search results, preferring workspace contacts when duplicates are found.
 */
export function deduplicateSearchContacts(
  apolloContacts: SearchResultContact[],
  workspaceContacts: SearchResultContact[],
): SearchResultContact[] {
  const workspaceWithSource = workspaceContacts.map((contact) => ({
    ...contact,
    source: "workspace" as const,
  }));

  const byId = new Map<string, SearchResultContact>();
  const byEmail = new Map<string, SearchResultContact>();
  const byApolloId = new Map<string, SearchResultContact>();
  const byProspectId = new Map<string, SearchResultContact>();
  const byNameCompany = new Map<string, SearchResultContact>();

  for (const contact of workspaceWithSource) {
    byId.set(contact.id, contact);

    const email = normalizeEmail(contact.email);
    if (email) byEmail.set(email, contact);

    if (contact.apollo_id) byApolloId.set(contact.apollo_id, contact);
    if (contact.platform_prospect_id) byProspectId.set(contact.platform_prospect_id, contact);

    const key = nameCompanyKey(contact.full_name, contact.company_name);
    if (key) byNameCompany.set(key, contact);
  }

  const indexes = { byId, byEmail, byApolloId, byProspectId, byNameCompany };
  const dedupedApollo: SearchResultContact[] = [];

  for (const apollo of apolloContacts) {
    const duplicate = isDuplicate(apollo, indexes);
    if (duplicate) {
      const enriched = enrichWorkspaceFromApollo(duplicate, apollo);
      byId.set(enriched.id, enriched);

      const email = normalizeEmail(enriched.email);
      if (email) byEmail.set(email, enriched);

      if (enriched.apollo_id) byApolloId.set(enriched.apollo_id, enriched);
      if (enriched.platform_prospect_id) byProspectId.set(enriched.platform_prospect_id, enriched);

      const key = nameCompanyKey(enriched.full_name, enriched.company_name);
      if (key) byNameCompany.set(key, enriched);
      continue;
    }

    dedupedApollo.push({
      ...apollo,
      source: "platform",
    });
  }

  return [...Array.from(byId.values()), ...dedupedApollo];
}
