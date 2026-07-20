import { isDataDemoMode } from "@/lib/app-config";
import {
  filterContactsByQuery,
  getDemoContactById,
  getDemoContacts,
  importDemoContacts,
} from "@/lib/demo-store";
import { buildContactEmbedding } from "@/lib/data/embeddings";
import { computeLeadScore, contactSearchSnippet } from "@/lib/contacts/enrichment";
import {
  buildMergedContactUpdate,
  findExistingContact,
  indexExistingContacts,
  normalizeEmail,
  normalizePersonName,
  type ExistingContactMatch,
} from "@/lib/contacts/contact-dedupe";
import { getUserWorkspaceContext, listUserWorkspaces } from "@/lib/data/workspace";
import {
  isContactExcluded,
  type ContactExcludedStatus,
} from "@/lib/contacts/exclude";
import type { Contact } from "@/types";

export type { ContactExcludedStatus };
export { isContactExcluded };

type SearchContactMatch = {
  id: string;
  full_name: string;
  title: string | null;
  email: string | null;
  company_name: string | null;
  location?: string | null;
  strength_score?: number;
  enrichment_snippet?: string | null;
  similarity?: number;
  network_owner_name?: string | null;
  group_name?: string | null;
};

function ownerNameFromProfile(
  owner: { name: string | null; email: string | null } | { name: string | null; email: string | null }[] | null,
) {
  const profile = Array.isArray(owner) ? owner[0] : owner;
  return profile?.name || profile?.email || null;
}

async function attachContactMetadata(
  supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>,
  rows: SearchContactMatch[],
): Promise<SearchContactMatch[]> {
  if (!rows.length) return rows;

  const { data } = await supabase
    .from("contacts")
    .select(
      "id, location, strength_score, metadata, owner:profiles!contacts_owner_id_fkey(name, email), workspace:workspaces(name)",
    )
    .in(
      "id",
      rows.map((row) => row.id),
    );

  const metadata = new Map(
    (data ?? []).map((row) => {
      const workspace = row.workspace as { name: string } | { name: string }[] | null;
      const workspaceName = Array.isArray(workspace) ? workspace[0]?.name : workspace?.name;
      const contactMeta = (row.metadata as Record<string, unknown> | null) ?? null;
      return [
        row.id as string,
        {
          network_owner_name: ownerNameFromProfile(
            row.owner as
              | { name: string | null; email: string | null }
              | { name: string | null; email: string | null }[]
              | null,
          ),
          group_name: workspaceName ?? null,
          location: (row.location as string | null) ?? null,
          strength_score: typeof row.strength_score === "number" ? row.strength_score : 0,
          enrichment_snippet: contactSearchSnippet({
            location: row.location as string | null,
            metadata: contactMeta,
          }),
        },
      ];
    }),
  );

  return rows.map((row) => {
    const extra = metadata.get(row.id);
    return {
      ...row,
      network_owner_name: extra?.network_owner_name ?? null,
      group_name: extra?.group_name ?? null,
      location: extra?.location ?? row.location ?? null,
      strength_score: extra?.strength_score ?? row.strength_score ?? 0,
      enrichment_snippet: extra?.enrichment_snippet ?? row.enrichment_snippet ?? null,
    };
  });
}

type ListContactsOptions = {
  allGroups?: boolean;
  limit?: number;
  offset?: number;
  q?: string;
  source?: string;
  importBatchId?: string;
  /** Default `active` hides excluded contacts from network lists. */
  excludedStatus?: ContactExcludedStatus;
  hasEmail?: boolean;
  hasCompany?: boolean;
  hasTitle?: boolean;
  /** Service-role / system runs scoped to one workspace. */
  asAdmin?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any;
    workspaceId: string;
  };
};

function applyContactFieldFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase filter builder chain
  query: any,
  options: Pick<
    ListContactsOptions,
    "excludedStatus" | "hasEmail" | "hasCompany" | "hasTitle"
  >,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const excludedStatus = options.excludedStatus ?? "active";
  if (excludedStatus === "excluded") {
    query = query.contains("metadata", { excluded: true });
  } else if (excludedStatus === "active") {
    query = query.or("metadata->>excluded.is.null,metadata->>excluded.eq.false");
  }

  if (options.hasEmail === true) {
    query = query.not("email", "is", null).neq("email", "");
  }
  if (options.hasCompany === true) {
    query = query.not("company_name", "is", null).neq("company_name", "");
  }
  if (options.hasTitle === true) {
    query = query.not("title", "is", null).neq("title", "");
  }

  return query;
}

function matchesClientFilters(
  contact: Contact,
  options: Pick<
    ListContactsOptions,
    "excludedStatus" | "hasEmail" | "hasCompany" | "hasTitle" | "source" | "importBatchId"
  >,
) {
  const excludedStatus = options.excludedStatus ?? "active";
  const excluded = isContactExcluded(contact);
  if (excludedStatus === "active" && excluded) return false;
  if (excludedStatus === "excluded" && !excluded) return false;

  if (options.source && contact.source !== options.source) return false;
  if (options.importBatchId) {
    const batch = (contact.metadata as { import_batch_id?: string } | null)?.import_batch_id;
    if (batch !== options.importBatchId) return false;
  }
  if (options.hasEmail === true && !contact.email?.trim()) return false;
  if (options.hasCompany === true && !contact.company_name?.trim()) return false;
  if (options.hasTitle === true && !contact.title?.trim()) return false;
  return true;
}

function sanitizeSearchTerm(q: string) {
  return q.trim().replace(/[%_,]/g, "");
}

function applyContactSearch<T extends { or: (filters: string) => T }>(query: T, q?: string) {
  const term = q ? sanitizeSearchTerm(q) : "";
  if (!term) return query;
  const pattern = `%${term}%`;
  return query.or(
    `full_name.ilike.${pattern},email.ilike.${pattern},company_name.ilike.${pattern},title.ilike.${pattern}`,
  );
}

export async function countContacts(
  allGroupsOrOptions: boolean | Omit<ListContactsOptions, "limit" | "offset"> = true,
): Promise<number> {
  const options =
    typeof allGroupsOrOptions === "boolean"
      ? { allGroups: allGroupsOrOptions }
      : allGroupsOrOptions;
  const {
    allGroups = true,
    q,
    source,
    importBatchId,
    excludedStatus,
    hasEmail,
    hasCompany,
    hasTitle,
  } = options;

  if (isDataDemoMode()) {
    const contacts = getDemoContacts().filter((contact) =>
      matchesClientFilters(contact, {
        source,
        importBatchId,
        excludedStatus,
        hasEmail,
        hasCompany,
        hasTitle,
      }),
    );
    if (!q?.trim()) return contacts.length;
    return filterContactsByQuery(q, contacts).length;
  }

  const { supabase, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext();
  if (!supabase) return 0;

  const workspaceIds = allGroups
    ? (await listUserWorkspaces(supabase)).map((workspace) => workspace.id)
    : activeWorkspaceId
      ? [activeWorkspaceId]
      : [];

  if (!workspaceIds.length) return 0;

  let query = supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .in("workspace_id", workspaceIds);

  if (source) query = query.eq("source", source);
  if (importBatchId) query = query.contains("metadata", { import_batch_id: importBatchId });
  query = applyContactFieldFilters(query, {
    excludedStatus,
    hasEmail,
    hasCompany,
    hasTitle,
  });

  query = applyContactSearch(query, q);

  const { count, error } = await query;

  if (error) throw error;
  return count ?? 0;
}

export async function listContacts(
  allGroupsOrOptions: boolean | ListContactsOptions = true,
): Promise<Contact[]> {
  const options =
    typeof allGroupsOrOptions === "boolean"
      ? { allGroups: allGroupsOrOptions }
      : allGroupsOrOptions;
  const {
    allGroups = true,
    limit,
    offset = 0,
    q,
    source,
    importBatchId,
    excludedStatus,
    hasEmail,
    hasCompany,
    hasTitle,
  } = options;

  if (isDataDemoMode()) {
    let contacts = getDemoContacts().filter((contact) =>
      matchesClientFilters(contact, {
        source,
        importBatchId,
        excludedStatus,
        hasEmail,
        hasCompany,
        hasTitle,
      }),
    );
    if (q?.trim()) {
      contacts = filterContactsByQuery(q, contacts);
    }
    if (limit == null) return contacts;
    return contacts.slice(offset, offset + limit);
  }

  const asAdmin = options.asAdmin;
  const session = asAdmin ? null : await getUserWorkspaceContext();
  const supabase = asAdmin?.supabase ?? session?.supabase;
  if (!supabase) return [];

  const workspaceIds = asAdmin
    ? [asAdmin.workspaceId]
    : allGroups
      ? (await listUserWorkspaces(supabase)).map((workspace) => workspace.id)
      : session?.workspaceId
        ? [session.workspaceId]
        : [];

  if (!workspaceIds.length) return [];

  let query = supabase
    .from("contacts")
    .select("*")
    .in("workspace_id", workspaceIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (source) query = query.eq("source", source);
  if (importBatchId) query = query.contains("metadata", { import_batch_id: importBatchId });
  query = applyContactFieldFilters(query, {
    excludedStatus,
    hasEmail,
    hasCompany,
    hasTitle,
  });

  query = applyContactSearch(query, q);

  if (limit != null) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as Contact[];
}

export async function getContactsByIds(ids: string[]): Promise<Contact[]> {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return [];

  if (isDataDemoMode()) {
    return uniqueIds
      .map((id) => getDemoContactById(id))
      .filter((contact): contact is Contact => Boolean(contact));
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return [];

  // Chunk to avoid UND_ERR_HEADERS_OVERFLOW on large .in() filter URLs.
  const CHUNK = 80;
  const contacts: Contact[] = [];
  for (let i = 0; i < uniqueIds.length; i += CHUNK) {
    const slice = uniqueIds.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("contacts").select("*").in("id", slice);
    if (error) throw error;
    if (data?.length) contacts.push(...(data as Contact[]));
  }
  return contacts;
}

export async function getContact(id: string): Promise<Contact | null> {
  if (isDataDemoMode()) return getDemoContactById(id) ?? null;

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return null;

  const { data, error } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Contact) ?? null;
}

export async function searchContactsForQuery(
  query: string,
  options?: { workspaceId?: string | null; ownerId?: string | null },
) {
  if (isDataDemoMode()) {
    const contacts = filterContactsByQuery(query, getDemoContacts());
    return contacts.map((c, i) => ({
      id: c.id,
      full_name: c.full_name,
      title: c.title,
      email: c.email,
      company_name: c.company_name,
      similarity: 0.95 - i * 0.05,
      network_owner_name: i % 2 === 0 ? "Alex Morgan" : "Jordan Lee",
      group_name: i % 2 === 0 ? "Acme Ventures" : "Product Team",
    }));
  }

  const { supabase } = await getUserWorkspaceContext(undefined, options?.workspaceId);
  if (!supabase) return [];

  const workspaceIds = options?.workspaceId
    ? [options.workspaceId]
    : (await listUserWorkspaces(supabase)).map((workspace) => workspace.id);

  if (!workspaceIds.length) return [];

  const { generateEmbedding } = await import("@/lib/ai/openai");
  const embedding = await generateEmbedding(query);

  let matches: SearchContactMatch[] = [];
  const { data: vectorMatches, error: vectorError } = await supabase.rpc("match_contacts_in_workspaces", {
    query_embedding: embedding,
    match_workspace_ids: workspaceIds,
    match_threshold: 0.3,
    match_count: 20,
  });

  if (!vectorError && vectorMatches?.length) {
    matches = vectorMatches as SearchContactMatch[];
  } else if (vectorError) {
    const perWorkspace = await Promise.all(
      workspaceIds.map(async (workspaceId) => {
        const { data } = await supabase.rpc("match_contacts", {
          query_embedding: embedding,
          match_workspace_id: workspaceId,
          match_threshold: 0.3,
          match_count: 20,
        });
        return (data ?? []) as SearchContactMatch[];
      }),
    );
    const seen = new Set<string>();
    matches = perWorkspace
      .flat()
      .filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      })
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, 20);
  }

  if (options?.ownerId && matches.length > 0) {
    const { data: ownedIds } = await supabase
      .from("contacts")
      .select("id")
      .in("workspace_id", workspaceIds)
      .eq("owner_id", options.ownerId);
    const allowed = new Set((ownedIds ?? []).map((row) => row.id));
    matches = matches.filter((row) => allowed.has(row.id));
  }

  if (matches.length > 0) {
    return attachContactMetadata(supabase, matches);
  }

  let textQuery = supabase
    .from("contacts")
    .select(
      "id, full_name, title, email, company_name, location, strength_score, metadata, owner:profiles!contacts_owner_id_fkey(name, email), workspace:workspaces(name)",
    )
    .in("workspace_id", workspaceIds)
    .or(
      `full_name.ilike.%${query}%,title.ilike.%${query}%,company_name.ilike.%${query}%,email.ilike.%${query}%,location.ilike.%${query}%`,
    )
    .order("strength_score", { ascending: false })
    .limit(20);

  if (options?.ownerId) {
    textQuery = textQuery.eq("owner_id", options.ownerId);
  }

  const { data: textMatches } = await textQuery;

  return (textMatches ?? []).map((c, i) => {
    const row = c as SearchContactMatch & {
      metadata?: Record<string, unknown> | null;
      owner: { name: string | null; email: string | null } | { name: string | null; email: string | null }[] | null;
      workspace: { name: string } | { name: string }[] | null;
    };
    const workspace = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace;
    return {
      id: row.id,
      full_name: row.full_name,
      title: row.title,
      email: row.email,
      company_name: row.company_name,
      location: row.location ?? null,
      strength_score: row.strength_score ?? 0,
      enrichment_snippet: contactSearchSnippet({
        location: row.location,
        metadata: row.metadata ?? null,
      }),
      similarity: 0.85 - i * 0.03,
      network_owner_name: ownerNameFromProfile(row.owner),
      group_name: workspace?.name ?? null,
    };
  });
}

export async function importContacts(
  rows: Array<{
    full_name: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    title?: string;
    company_name?: string;
    phone?: string;
    linkedin_url?: string;
    twitter_url?: string;
    location?: string;
    extras?: Record<string, string>;
  }>,
  options?: {
    importBatchId?: string;
    fileName?: string;
    sheetName?: string;
  },
) {
  return importContactsFromSource(rows, "csv", {
    skipEmbeddings: true,
    importBatchId: options?.importBatchId,
    fileName: options?.fileName,
    sheetName: options?.sheetName,
  });
}

type ImportOptions = {
  skipEmbeddings?: boolean;
  importBatchId?: string;
  fileName?: string;
  sheetName?: string;
  /** Used by cron / service-role syncs without a user session. */
  asAdmin?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any;
    userId: string;
    workspaceId: string;
  };
};

type ImportRow = {
  full_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  company_name?: string;
  phone?: string;
  linkedin_url?: string;
  twitter_url?: string;
  location?: string;
  external_id?: string;
  extras?: Record<string, string>;
};

const BULK_INSERT_SIZE = 200;

function rowMetadata(row: ImportRow, base: Record<string, unknown>) {
  return {
    ...base,
    ...(row.extras ?? {}),
  };
}

function rowDbFields(row: ImportRow) {
  const metadata = row.extras ?? {};
  const email = normalizeEmail(row.email);
  return {
    full_name: row.full_name,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    email,
    title: row.title ?? null,
    company_name: row.company_name ?? null,
    phone: row.phone ?? null,
    linkedin_url: row.linkedin_url ?? null,
    twitter_url: row.twitter_url ?? null,
    location: row.location ?? null,
    external_id: row.external_id ?? null,
    strength_score: computeLeadScore({
      title: row.title,
      company_name: row.company_name,
      email,
      phone: row.phone,
      linkedin_url: row.linkedin_url,
      location: row.location,
      extras: row.extras,
      metadata,
    }),
  };
}

const EXISTING_CONTACT_SELECT =
  "id, full_name, email, external_id, title, company_name, phone, linkedin_url, twitter_url, location, first_name, last_name, strength_score, metadata";

function asExistingMatch(row: Record<string, unknown>): ExistingContactMatch {
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ""),
    email: (row.email as string | null) ?? null,
    external_id: (row.external_id as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    company_name: (row.company_name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    linkedin_url: (row.linkedin_url as string | null) ?? null,
    twitter_url: (row.twitter_url as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    first_name: (row.first_name as string | null) ?? null,
    last_name: (row.last_name as string | null) ?? null,
    strength_score: typeof row.strength_score === "number" ? row.strength_score : 0,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  };
}

/** Load workspace contacts that could match this import batch (email / name / external_id). */
async function loadExistingMatchesForImport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  workspaceId: string,
  rows: ImportRow[],
): Promise<ExistingContactMatch[]> {
  const emails = [
    ...new Set(rows.map((r) => normalizeEmail(r.email)).filter((e): e is string => Boolean(e))),
  ];
  const names = [
    ...new Set(
      rows
        .filter((r) => !normalizeEmail(r.email))
        .map((r) => r.full_name?.trim())
        .filter((n): n is string => Boolean(n)),
    ),
  ];
  const externalIds = [
    ...new Set(rows.map((r) => r.external_id?.trim()).filter((id): id is string => Boolean(id))),
  ];

  const found = new Map<string, ExistingContactMatch>();

  const quoteFilterValue = (value: string) => `"${value.replace(/"/g, "")}"`;

  for (let i = 0; i < emails.length; i += 100) {
    const slice = emails.slice(i, i + 100);
    // Case-insensitive email match via ilike (no wildcards)
    const orFilter = slice.map((email) => `email.ilike.${quoteFilterValue(email)}`).join(",");
    const { data } = await supabase
      .from("contacts")
      .select(EXISTING_CONTACT_SELECT)
      .eq("workspace_id", workspaceId)
      .or(orFilter);
    for (const row of data ?? []) {
      const match = asExistingMatch(row);
      found.set(match.id, match);
    }
  }

  for (let i = 0; i < externalIds.length; i += 200) {
    const slice = externalIds.slice(i, i + 200);
    const { data } = await supabase
      .from("contacts")
      .select(EXISTING_CONTACT_SELECT)
      .eq("workspace_id", workspaceId)
      .in("external_id", slice);
    for (const row of data ?? []) {
      const match = asExistingMatch(row);
      found.set(match.id, match);
    }
  }

  for (let i = 0; i < names.length; i += 100) {
    const slice = names.slice(i, i + 100);
    const orFilter = slice
      .map((name) => `full_name.ilike.${quoteFilterValue(name)}`)
      .join(",");
    if (!orFilter) continue;
    const { data } = await supabase
      .from("contacts")
      .select(EXISTING_CONTACT_SELECT)
      .eq("workspace_id", workspaceId)
      .or(orFilter);
    for (const row of data ?? []) {
      const match = asExistingMatch(row);
      // Only keep name matches that normalize equal (ilike is broader)
      const wanted = new Set(slice.map((n) => normalizePersonName(n)).filter(Boolean));
      if (wanted.has(normalizePersonName(match.full_name))) {
        found.set(match.id, match);
      }
    }
  }

  return [...found.values()];
}

export async function importContactsFromSource(
  rows: ImportRow[],
  source: import("@/types").SyncSource,
  options?: ImportOptions,
) {
  const result = await importContactsFromSourceInner(rows, source, options);
  if (!options?.asAdmin && result.imported > 0) {
    void import("@/lib/workflows/triggers")
      .then(({ triggerNewContactWorkflows }) =>
        triggerNewContactWorkflows({ importedCount: result.imported }),
      )
      .catch((error) => {
        console.error("New-contact workflow trigger failed:", error);
      });
  }
  return result;
}

async function importContactsFromSourceInner(
  rows: ImportRow[],
  source: import("@/types").SyncSource,
  options?: ImportOptions,
) {
  if (isDataDemoMode()) return importDemoContacts(rows);

  const adminContext = options?.asAdmin;
  const sessionContext = adminContext ? null : await getUserWorkspaceContext();
  const supabase = adminContext?.supabase ?? sessionContext?.supabase;
  const userId = adminContext?.userId ?? sessionContext?.user?.id;
  const workspaceId = adminContext?.workspaceId ?? sessionContext?.workspaceId;
  if (!supabase || !userId || !workspaceId) throw new Error("Unauthorized");

  const skipEmbeddings = options?.skipEmbeddings === true || source === "csv";
  const importBatchId = options?.importBatchId;
  const metadataBase: Record<string, unknown> = {};
  if (importBatchId) metadataBase.import_batch_id = importBatchId;
  if (options?.fileName) metadataBase.file_name = options.fileName;
  if (options?.sheetName) metadataBase.sheet_name = options.sheetName;

  // Fast path for CSV / large imports: bulk insert + lead scores, embeddings backfilled async.
  if (skipEmbeddings) {
    const result = await bulkImportContacts(supabase, {
      rows,
      source,
      workspaceId,
      ownerId: userId,
      metadata: metadataBase,
    });
    // Enrich search embeddings in the background so CSV fields power semantic search.
    void backfillImportEmbeddings(supabase, {
      workspaceId,
      importBatchId: typeof metadataBase.import_batch_id === "string" ? metadataBase.import_batch_id : null,
      rows,
    }).catch((error) => {
      console.error("Contact embedding backfill failed:", error);
    });
    return result;
  }

  let imported = 0;
  let updated = 0;

  const existingRows = await loadExistingMatchesForImport(supabase, workspaceId, rows);
  const indexes = indexExistingContacts(existingRows);

  for (const row of rows) {
    const fields = rowDbFields(row);
    const metadata = rowMetadata(row, metadataBase);
    const existing = findExistingContact(indexes, row);

    if (existing) {
      const merged = buildMergedContactUpdate({
        existing,
        incoming: fields,
        source,
        metadataIncoming: metadata,
      });
      const embedding = await buildContactEmbedding({
        ...merged,
        metadata: merged.metadata,
      });
      await supabase
        .from("contacts")
        .update({
          ...merged,
          embedding,
        })
        .eq("id", existing.id);

      // Keep indexes fresh for later rows in this batch
      const refreshed: ExistingContactMatch = {
        ...existing,
        full_name: merged.full_name,
        email: merged.email,
        external_id: merged.external_id,
        title: merged.title,
        company_name: merged.company_name,
        phone: merged.phone,
        linkedin_url: merged.linkedin_url,
        twitter_url: merged.twitter_url,
        location: merged.location,
        first_name: merged.first_name,
        last_name: merged.last_name,
        strength_score: merged.strength_score,
        metadata: merged.metadata,
      };
      if (existing.external_id) indexes.byExternalId.set(existing.external_id, refreshed);
      if (merged.external_id) indexes.byExternalId.set(merged.external_id, refreshed);
      if (merged.email) indexes.byEmail.set(merged.email, refreshed);
      const nameKey = normalizePersonName(merged.full_name);
      if (nameKey) indexes.byName.set(nameKey, refreshed);

      updated += 1;
      continue;
    }

    const embedding = await buildContactEmbedding({
      ...fields,
      extras: row.extras,
      metadata,
    });

    const { data: inserted, error } = await supabase
      .from("contacts")
      .insert({
        ...fields,
        workspace_id: workspaceId,
        owner_id: userId,
        source,
        tags: ["imported"],
        embedding,
        metadata: {
          ...metadata,
          sources: [source],
          ...(fields.external_id
            ? { external_ids: { [source]: fields.external_id } }
            : {}),
        },
      })
      .select(EXISTING_CONTACT_SELECT)
      .maybeSingle();

    if (!error && inserted) {
      imported += 1;
      const match = asExistingMatch(inserted);
      if (match.external_id) indexes.byExternalId.set(match.external_id, match);
      if (match.email) indexes.byEmail.set(normalizeEmail(match.email)!, match);
      const nameKey = normalizePersonName(match.full_name);
      if (nameKey) indexes.byName.set(nameKey, match);
    }
  }

  return { imported, updated, duplicates: 0 };
}

const EMBEDDING_BACKFILL_CONCURRENCY = 6;
const EMBEDDING_BACKFILL_LIMIT = 200;

async function backfillImportEmbeddings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: {
    workspaceId: string;
    importBatchId: string | null;
    rows: ImportRow[];
  },
) {
  const { workspaceId, importBatchId, rows } = args;
  let contactIds: string[] = [];

  if (importBatchId) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .contains("metadata", { import_batch_id: importBatchId })
      .is("embedding", null)
      .limit(EMBEDDING_BACKFILL_LIMIT);
    contactIds = (data ?? []).map((row: { id: string }) => row.id);
  } else {
    const emails = [
      ...new Set(rows.map((r) => r.email?.trim()).filter((e): e is string => Boolean(e))),
    ].slice(0, EMBEDDING_BACKFILL_LIMIT);
    if (!emails.length) return;
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("email", emails)
      .is("embedding", null);
    contactIds = (data ?? []).map((row: { id: string }) => row.id);
  }

  for (let i = 0; i < contactIds.length; i += EMBEDDING_BACKFILL_CONCURRENCY) {
    const wave = contactIds.slice(i, i + EMBEDDING_BACKFILL_CONCURRENCY);
    await Promise.all(
      wave.map(async (id) => {
        const { data: contact } = await supabase
          .from("contacts")
          .select(
            "id, full_name, title, company_name, email, bio, location, linkedin_url, tags, metadata",
          )
          .eq("id", id)
          .maybeSingle();
        if (!contact) return;
        const embedding = await buildContactEmbedding({
          full_name: contact.full_name,
          title: contact.title,
          company_name: contact.company_name,
          email: contact.email,
          bio: contact.bio,
          location: contact.location,
          linkedin_url: contact.linkedin_url,
          tags: contact.tags ?? [],
          metadata: (contact.metadata as Record<string, unknown> | null) ?? null,
        });
        await supabase.from("contacts").update({ embedding }).eq("id", id);
      }),
    );
  }
}

async function bulkImportContacts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: {
    rows: ImportRow[];
    source: import("@/types").SyncSource;
    workspaceId: string;
    ownerId: string;
    metadata: Record<string, unknown>;
  },
) {
  const { rows, source, workspaceId, ownerId, metadata } = args;
  let imported = 0;
  let updated = 0;

  const existingRows = await loadExistingMatchesForImport(supabase, workspaceId, rows);
  const indexes = indexExistingContacts(existingRows);

  const toInsert: Array<Record<string, unknown>> = [];
  const toUpdate: Array<{ id: string; payload: Record<string, unknown> }> = [];
  const pendingEmails = new Set<string>();
  const pendingNames = new Set<string>();

  for (const row of rows) {
    const fields = rowDbFields(row);
    const emailKey = normalizeEmail(row.email);
    const nameKey = normalizePersonName(row.full_name);
    const existing = findExistingContact(indexes, row);

    if (existing) {
      const merged = buildMergedContactUpdate({
        existing,
        incoming: fields,
        source,
        metadataIncoming: rowMetadata(row, metadata),
      });
      toUpdate.push({ id: existing.id, payload: merged });

      const refreshed: ExistingContactMatch = {
        ...existing,
        full_name: merged.full_name,
        email: merged.email,
        external_id: merged.external_id,
        title: merged.title,
        company_name: merged.company_name,
        phone: merged.phone,
        linkedin_url: merged.linkedin_url,
        twitter_url: merged.twitter_url,
        location: merged.location,
        first_name: merged.first_name,
        last_name: merged.last_name,
        strength_score: merged.strength_score,
        metadata: merged.metadata,
      };
      if (existing.external_id) indexes.byExternalId.set(existing.external_id, refreshed);
      if (merged.external_id) indexes.byExternalId.set(merged.external_id, refreshed);
      if (merged.email) indexes.byEmail.set(merged.email, refreshed);
      const refreshedName = normalizePersonName(merged.full_name);
      if (refreshedName) indexes.byName.set(refreshedName, refreshed);
      continue;
    }

    if (emailKey && pendingEmails.has(emailKey)) continue;
    if (!emailKey && nameKey && pendingNames.has(nameKey)) continue;

    toInsert.push({
      ...fields,
      workspace_id: workspaceId,
      owner_id: ownerId,
      source,
      tags: ["imported"],
      metadata: {
        ...rowMetadata(row, metadata),
        sources: [source],
        ...(fields.external_id ? { external_ids: { [source]: fields.external_id } } : {}),
      },
    });

    if (emailKey) pendingEmails.add(emailKey);
    else if (nameKey) pendingNames.add(nameKey);
  }

  for (let i = 0; i < toInsert.length; i += BULK_INSERT_SIZE) {
    const chunk = toInsert.slice(i, i + BULK_INSERT_SIZE);
    const { error, data } = await supabase.from("contacts").insert(chunk).select("id");
    if (error) {
      console.error("Bulk contact insert failed:", error.message);
      throw new Error(error.message);
    }
    imported += data?.length ?? chunk.length;
  }

  const UPDATE_CONCURRENCY = 25;
  for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
    const wave = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
    const results = await Promise.all(
      wave.map(({ id, payload }) => supabase.from("contacts").update(payload).eq("id", id)),
    );
    updated += results.filter((r: { error: unknown }) => !r.error).length;
  }

  return { imported, updated, duplicates: 0 };
}

export async function saveSearchHistory(
  query: string,
  result: unknown,
  workspaceId?: string | null,
) {
  if (isDataDemoMode()) {
    const { addSearchHistory } = await import("@/lib/demo-store");
    addSearchHistory(query);
    return;
  }

  const { supabase, user, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext(
    undefined,
    workspaceId,
  );
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
  if (!supabase || !user || !targetWorkspaceId) return;

  await supabase.from("search_history").insert({
    workspace_id: targetWorkspaceId,
    user_id: user.id,
    query,
    result,
  });
}

/** Mark contacts as excluded (hidden from the network) or restore them. */
export async function setContactsExcluded(ids: string[], excluded: boolean) {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (!uniqueIds.length) return { updated: 0 };

  if (isDataDemoMode()) {
    const { setDemoContactsExcluded } = await import("@/lib/demo-store");
    return setDemoContactsExcluded(uniqueIds, excluded);
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  const contacts = await getContactsByIds(uniqueIds);
  if (!contacts.length) return { updated: 0 };

  const now = new Date().toISOString();
  let updated = 0;

  await Promise.all(
    contacts.map(async (contact) => {
      const metadata = {
        ...(contact.metadata ?? {}),
        excluded,
        excluded_at: excluded ? now : null,
      };
      const { error } = await supabase
        .from("contacts")
        .update({ metadata, updated_at: now })
        .eq("id", contact.id);
      if (error) throw error;
      updated += 1;
    }),
  );

  return { updated };
}
