/** @deprecated Use platform-prospects instead. Compatibility re-exports. */
export {
  type PlatformProspect as ApolloRecord,
  type EnrichPlatformProspectResult as EnrichApolloRecordResult,
  canEnrichPlatformProspect as canEnrichApolloRecord,
  getPlatformProspect as getApolloRecord,
  enrichPlatformProspects as enrichApolloRecords,
  addPlatformProspectsToContacts as promoteApolloRecordsToContacts,
  saveApolloProspectsForPlaybookRun,
  upsertPlatformProspectsFromRecords,
  upsertPlatformProspectsFromApollo,
} from "@/lib/data/platform-prospects";

import type { ApolloOrganization, ApolloPerson } from "@/lib/integrations/apollo/types";
import {
  mapApolloOrganizationsToRecords,
  mapApolloPeopleToRecords,
} from "@/lib/integrations/apollo/map-to-record";
import { upsertPlatformProspectsFromRecords } from "@/lib/data/platform-prospects";

export async function upsertApolloRecordsFromApolloPayload(args: {
  people?: ApolloPerson[];
  organizations?: ApolloOrganization[];
  savedFrom?: string;
}) {
  const source = args.savedFrom ?? "search";
  const rows = [
    ...mapApolloPeopleToRecords(args.people ?? []),
    ...mapApolloOrganizationsToRecords(args.organizations ?? []),
  ];
  const result = await upsertPlatformProspectsFromRecords(rows, source);
  return { saved: result.saved, records: result.prospects };
}

export async function upsertApolloRecordsFromSearch(
  people: ApolloPerson[],
  source: string,
) {
  const { upsertPlatformProspectsFromApollo } = await import("@/lib/data/platform-prospects");
  const result = await upsertPlatformProspectsFromApollo(people, source);
  return { saved: result.saved, records: result.prospects };
}

export async function listApolloRecords(options?: {
  type?: "person" | "organization";
  q?: string;
  limit?: number;
  offset?: number;
  enrichmentStatus?: string;
  inContacts?: boolean;
}) {
  void options;
  return { records: [], total: 0 };
}

export async function getApolloRecordByContactId() {
  return null;
}

export async function findOrCreateApolloRecordFromContact(contact: {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  title?: string | null;
  company_name?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
}) {
  const { getPlatformProspect, upsertPlatformProspectsFromRecords } = await import(
    "@/lib/data/platform-prospects"
  );
  const { mapContactToApolloRecordStub } = await import("@/lib/integrations/apollo/map-to-record");
  const { getUserWorkspaceContext } = await import("@/lib/data/workspace");

  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) throw new Error("Unauthorized");

  const { data: linked } = await supabase
    .from("contacts")
    .select("platform_prospect_id")
    .eq("id", contact.id)
    .maybeSingle();

  if (linked?.platform_prospect_id) {
    const prospect = await getPlatformProspect(linked.platform_prospect_id as string);
    if (prospect) return prospect;
  }

  const stub = mapContactToApolloRecordStub(contact);
  const result = await upsertPlatformProspectsFromRecords([stub], "contact_stub");
  const prospect = result.prospects[0];
  if (!prospect) throw new Error("Failed to create platform prospect stub");

  await supabase
    .from("contacts")
    .update({ platform_prospect_id: prospect.id })
    .eq("id", contact.id);

  return prospect;
}
