import { importContactsFromSource } from "@/lib/data/contacts";
import { logAuditEvent } from "@/lib/data/audit";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import { withApolloAccount } from "@/lib/integrations/apollo/client";
import { buildPersonEnrichInput } from "@/lib/integrations/apollo/build-enrich-input";
import {
  mapApolloPeopleToRecords,
  type ApolloRecordUpsert,
} from "@/lib/integrations/apollo/map-to-record";
import { mapApolloPersonToImportRow } from "@/lib/integrations/apollo/map-to-contact";
import { enrichApolloPerson } from "@/lib/integrations/apollo/people-enrichment";
import {
  getApolloPersonDisplayName,
  isUnverifiedApolloStub,
  joinLocationParts,
} from "@/lib/integrations/apollo/present-record";
import type { ApolloPerson } from "@/lib/integrations/apollo/types";
import type { SearchResultContact } from "@/types";

export type PlatformProspect = {
  id: string;
  apollo_id: string;
  record_type: "person" | "organization";
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  location: string | null;
  linkedin_url: string | null;
  primary_domain: string | null;
  enrichment_status: string;
  enriched_at: string | null;
  raw_apollo: Record<string, unknown>;
  metadata: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
  search_hit_count: number;
  created_at: string;
  updated_at: string;
};

export type EnrichPlatformProspectResult = {
  id: string;
  status: "enriched" | "failed" | "skipped";
  reason?: string;
  error?: string;
  prospect?: PlatformProspect;
};

function prospectFromRow(row: Record<string, unknown>): PlatformProspect {
  return {
    id: row.id as string,
    apollo_id: row.apollo_id as string,
    record_type: row.record_type as PlatformProspect["record_type"],
    name: row.name as string,
    title: (row.title as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    company_name: (row.company_name as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    linkedin_url: (row.linkedin_url as string | null) ?? null,
    primary_domain: (row.primary_domain as string | null) ?? null,
    enrichment_status: row.enrichment_status as string,
    enriched_at: (row.enriched_at as string | null) ?? null,
    raw_apollo: (row.raw_apollo as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    first_seen_at: row.first_seen_at as string,
    last_seen_at: row.last_seen_at as string,
    search_hit_count: (row.search_hit_count as number) ?? 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function personPhoneFromRaw(raw: ApolloPerson): string | null {
  const phone =
    raw.phone_numbers?.find((entry) => entry.sanitized_number || entry.raw_number)
      ?.sanitized_number ??
    raw.phone_numbers?.find((entry) => entry.raw_number)?.raw_number ??
    null;
  return phone?.trim() || null;
}

function buildUpsertPayload(upsert: ApolloRecordUpsert, existing?: PlatformProspect | null) {
  const now = new Date().toISOString();
  const preserveEnriched = existing?.enrichment_status === "enriched";
  return {
    apollo_id: upsert.apollo_id,
    record_type: upsert.record_type,
    name: upsert.name,
    title: upsert.title ?? null,
    email: preserveEnriched ? existing?.email ?? upsert.email ?? null : upsert.email ?? null,
    phone: preserveEnriched ? existing?.phone ?? upsert.phone ?? null : upsert.phone ?? null,
    company_name: upsert.company_name ?? null,
    location: upsert.location ?? null,
    linkedin_url: upsert.linkedin_url ?? null,
    primary_domain: upsert.primary_domain ?? null,
    raw_apollo: preserveEnriched ? existing?.raw_apollo ?? upsert.raw_apollo : upsert.raw_apollo,
    enrichment_status: existing?.enrichment_status ?? "none",
    enriched_at: existing?.enriched_at ?? null,
    metadata: existing?.metadata ?? {},
    last_seen_at: now,
    updated_at: now,
    search_hit_count: (existing?.search_hit_count ?? 0) + 1,
  };
}

export function canEnrichPlatformProspect(prospect: PlatformProspect): { ok: boolean; reason?: string } {
  if (prospect.record_type === "organization") {
    if (prospect.primary_domain?.trim() || prospect.name?.trim()) return { ok: true };
    return { ok: false, reason: "insufficient_match_data" };
  }
  if (!isUnverifiedApolloStub(prospect.apollo_id)) return { ok: true };
  if (prospect.email?.trim() || prospect.linkedin_url?.trim()) return { ok: true };
  if (prospect.name?.trim() && (prospect.company_name?.trim() || prospect.primary_domain?.trim())) {
    return { ok: true };
  }
  return { ok: false, reason: "insufficient_match_data" };
}

export async function upsertPlatformProspectsFromRecords(
  rows: ApolloRecordUpsert[],
  source: string,
): Promise<{ saved: number; prospects: PlatformProspect[] }> {
  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");
  if (!rows.length) return { saved: 0, prospects: [] };

  const apolloIds = rows.map((row) => row.apollo_id);
  const { data: existingRows, error: existingError } = await supabase
    .from("platform_prospects")
    .select("*")
    .in("apollo_id", apolloIds);
  if (existingError) throw existingError;

  const existingByApolloId = new Map<string, PlatformProspect>();
  for (const row of existingRows ?? []) {
    const prospect = prospectFromRow(row as Record<string, unknown>);
    existingByApolloId.set(prospect.apollo_id, prospect);
  }

  const payloads = rows.map((row) => buildUpsertPayload(row, existingByApolloId.get(row.apollo_id)));
  const { data, error } = await supabase
    .from("platform_prospects")
    .upsert(payloads, { onConflict: "apollo_id" })
    .select("*");
  if (error) throw error;

  const prospects = (data ?? []).map((row) => prospectFromRow(row as Record<string, unknown>));
  await logAuditEvent("platform.prospects_saved", "platform_prospect", "batch", {
    count: prospects.length,
    source,
  });

  return { saved: prospects.length, prospects };
}

export async function upsertPlatformProspectsFromApollo(
  people: ApolloPerson[],
  source: string,
): Promise<{ saved: number; prospects: PlatformProspect[] }> {
  const rows = mapApolloPeopleToRecords(people);
  return upsertPlatformProspectsFromRecords(rows, source);
}

export async function getPlatformProspect(id: string): Promise<PlatformProspect | null> {
  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return null;

  const { data, error } = await supabase.from("platform_prospects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return prospectFromRow(data as Record<string, unknown>);
}

export async function getPlatformProspectsByIds(ids: string[]): Promise<PlatformProspect[]> {
  const { supabase } = await getUserWorkspaceContext();
  if (!supabase || !ids.length) return [];

  const { data, error } = await supabase.from("platform_prospects").select("*").in("id", ids);
  if (error) throw error;
  return (data ?? []).map((row) => prospectFromRow(row as Record<string, unknown>));
}

export async function searchPlatformProspects(
  query: string,
  limit = 20,
): Promise<PlatformProspect[]> {
  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("platform_prospects")
    .select("*")
    .or(
      `name.ilike.%${query}%,title.ilike.%${query}%,company_name.ilike.%${query}%,email.ilike.%${query}%,location.ilike.%${query}%`,
    )
    .order("search_hit_count", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Platform Prospects Search] Error:", error);
    return [];
  }

  console.log("[Platform Prospects Search] Found:", data?.length ?? 0, "prospects");
  return (data ?? []).map((row) => prospectFromRow(row as Record<string, unknown>));
}

export async function getLinkedContactIdsForProspects(
  prospectIds: string[],
  workspaceId: string,
): Promise<Map<string, string>> {
  const { supabase } = await getUserWorkspaceContext();
  const map = new Map<string, string>();
  if (!supabase || !prospectIds.length) return map;

  const { data, error } = await supabase
    .from("contacts")
    .select("id, platform_prospect_id")
    .eq("workspace_id", workspaceId)
    .in("platform_prospect_id", prospectIds);
  if (error) throw error;

  for (const row of data ?? []) {
    if (row.platform_prospect_id) {
      map.set(row.platform_prospect_id as string, row.id as string);
    }
  }
  return map;
}

function enrichedPersonUpdate(person: ApolloPerson, existing: PlatformProspect) {
  return {
    name: getApolloPersonDisplayName(person),
    title: person.title?.trim() || existing.title,
    email: person.email?.trim() || existing.email,
    phone: personPhoneFromRaw(person) || existing.phone,
    company_name: person.organization?.name?.trim() || existing.company_name,
    location: joinLocationParts([person.city, person.state, person.country]) || existing.location,
    linkedin_url: person.linkedin_url?.trim() || existing.linkedin_url,
    primary_domain: person.organization?.primary_domain?.trim() || existing.primary_domain,
    raw_apollo: person as Record<string, unknown>,
    enrichment_status: "enriched",
    enriched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    apollo_id: person.id?.trim() || existing.apollo_id,
  };
}

export async function syncEnrichedProspectToContacts(
  prospectId: string,
  workspaceId: string,
): Promise<number> {
  const prospect = await getPlatformProspect(prospectId);
  if (!prospect || prospect.enrichment_status !== "enriched") return 0;

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("platform_prospect_id", prospectId);
  if (error) throw error;
  if (!contacts?.length) return 0;

  const row = mapApolloPersonToImportRow(prospect.raw_apollo as ApolloPerson);
  if (!row) return 0;

  await importContactsFromSource([row], "apollo");
  return contacts.length;
}

export async function enrichPlatformProspects(args: {
  ids: string[];
  acknowledgeUnverified?: boolean;
  accountId?: string;
  syncToContacts?: boolean;
}): Promise<EnrichPlatformProspectResult[]> {
  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) throw new Error("Unauthorized");

  const results: EnrichPlatformProspectResult[] = [];

  for (const id of args.ids) {
    const prospect = await getPlatformProspect(id);
    if (!prospect) {
      results.push({ id, status: "skipped", reason: "not_found" });
      continue;
    }

    if (isUnverifiedApolloStub(prospect.apollo_id) && !args.acknowledgeUnverified) {
      results.push({ id, status: "skipped", reason: "unverified_stub" });
      continue;
    }

    const validation = canEnrichPlatformProspect(prospect);
    if (!validation.ok) {
      results.push({ id, status: "skipped", reason: validation.reason });
      continue;
    }

    try {
      const enrichResult = await withApolloAccount(args.accountId, async ({ accessToken }) =>
        enrichApolloPerson(accessToken, buildPersonEnrichInput(prospect)),
      );

      if (!enrichResult.person) {
        await supabase
          .from("platform_prospects")
          .update({
            enrichment_status: "failed",
            updated_at: new Date().toISOString(),
            metadata: {
              ...prospect.metadata,
              last_enrich_error: "no_match",
              last_enrich_at: new Date().toISOString(),
            },
          })
          .eq("id", prospect.id);
        results.push({ id, status: "failed", reason: "no_match" });
        continue;
      }

      const update = enrichedPersonUpdate(enrichResult.person, prospect);
      const { data, error } = await supabase
        .from("platform_prospects")
        .update(update)
        .eq("id", prospect.id)
        .select("*")
        .single();
      if (error) throw error;

      const enriched = prospectFromRow(data as Record<string, unknown>);
      if (args.syncToContacts !== false) {
        await syncEnrichedProspectToContacts(enriched.id, workspaceId);
      }

      results.push({ id, status: "enriched", prospect: enriched });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Apollo request failed";
      await supabase
        .from("platform_prospects")
        .update({
          enrichment_status: "failed",
          updated_at: new Date().toISOString(),
          metadata: {
            ...prospect.metadata,
            last_enrich_error: errorMessage,
            last_enrich_at: new Date().toISOString(),
          },
        })
        .eq("id", prospect.id);
      results.push({ id, status: "failed", reason: "api_error", error: errorMessage });
    }
  }

  await logAuditEvent("platform.prospects_enriched", "platform_prospect", "batch", {
    count: results.filter((result) => result.status === "enriched").length,
  });

  return results;
}

export async function addPlatformProspectsToContacts(
  prospectIds: string[],
): Promise<{ added: number; contactIds: string[] }> {
  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) throw new Error("Unauthorized");

  const prospects = await getPlatformProspectsByIds(prospectIds);
  const contactIds: string[] = [];

  for (const prospect of prospects) {
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("platform_prospect_id", prospect.id)
      .maybeSingle();

    if (existingContact?.id) {
      contactIds.push(existingContact.id as string);
      continue;
    }

    let importRow = mapApolloPersonToImportRow(prospect.raw_apollo as ApolloPerson);
    if (!importRow) {
      importRow = mapApolloPersonToImportRow({
        id: prospect.apollo_id,
        name: prospect.name,
        email: prospect.email ?? undefined,
        title: prospect.title ?? undefined,
        linkedin_url: prospect.linkedin_url ?? undefined,
        organization: prospect.company_name ? { name: prospect.company_name } : undefined,
      });
    }
    if (!importRow) continue;

    const importResult = await importContactsFromSource([importRow], "apollo");
    let contactId: string | null = null;

    if (importRow.external_id) {
      const { data } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("external_id", importRow.external_id)
        .maybeSingle();
      contactId = data?.id ?? null;
    }
    if (!contactId && importRow.email) {
      const { data } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", importRow.email)
        .maybeSingle();
      contactId = data?.id ?? null;
    }

    if (contactId) {
      await supabase
        .from("contacts")
        .update({ platform_prospect_id: prospect.id })
        .eq("id", contactId);
      contactIds.push(contactId);
    }

    void importResult;
  }

  await logAuditEvent("platform.prospects_added_to_contacts", "platform_prospect", "batch", {
    count: contactIds.length,
  });

  return { added: contactIds.length, contactIds };
}

export function mapPlatformProspectsToSearchContacts(
  prospects: PlatformProspect[],
  linkedContactIds: Map<string, string>,
): SearchResultContact[] {
  return prospects.map((prospect, index) => ({
    id: linkedContactIds.get(prospect.id) ?? prospect.id,
    full_name: prospect.name,
    title: prospect.title,
    email: prospect.email,
    company_name: prospect.company_name,
    score: Math.max(50, 95 - index * 3),
    reason: prospect.enrichment_status === "enriched" ? "Apollo match (enriched)" : "Apollo search match",
    warm_intro_path: [],
    recommended_action: prospect.enrichment_status === "enriched" ? "Add to segment" : "Enrich for details",
    source: "platform" as const,
    platform_prospect_id: prospect.id,
    apollo_id: prospect.apollo_id,
    enrichment_status: prospect.enrichment_status,
    in_contacts: linkedContactIds.has(prospect.id),
    raw_apollo: prospect.raw_apollo,
  }));
}

export async function saveApolloProspectsForPlaybookRun(
  people: ApolloPerson[],
): Promise<{ saved: number; prospects: PlatformProspect[] }> {
  return upsertPlatformProspectsFromApollo(people, "playbook");
}
