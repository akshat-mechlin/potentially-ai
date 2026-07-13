import { isDataDemoMode } from "@/lib/app-config";
import {
  filterContactsByQuery,
  getDemoContactById,
  getDemoContacts,
  importDemoContacts,
} from "@/lib/demo-store";
import { buildContactEmbedding } from "@/lib/data/embeddings";
import { getUserWorkspaceContext, listUserWorkspaces } from "@/lib/data/workspace";
import type { Contact } from "@/types";

type SearchContactMatch = {
  id: string;
  full_name: string;
  title: string | null;
  email: string | null;
  company_name: string | null;
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
      "id, owner:profiles!contacts_owner_id_fkey(name, email), workspace:workspaces(name)",
    )
    .in(
      "id",
      rows.map((row) => row.id),
    );

  const metadata = new Map(
    (data ?? []).map((row) => {
      const workspace = row.workspace as { name: string } | { name: string }[] | null;
      const workspaceName = Array.isArray(workspace) ? workspace[0]?.name : workspace?.name;
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
        },
      ];
    }),
  );

  return rows.map((row) => ({
    ...row,
    network_owner_name: metadata.get(row.id)?.network_owner_name ?? null,
    group_name: metadata.get(row.id)?.group_name ?? null,
  }));
}

type ListContactsOptions = {
  allGroups?: boolean;
  limit?: number;
  offset?: number;
  q?: string;
};

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
  const { allGroups = true, q } = options;

  if (isDataDemoMode()) {
    const contacts = getDemoContacts();
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
  const { allGroups = true, limit, offset = 0, q } = options;

  if (isDataDemoMode()) {
    let contacts = getDemoContacts();
    if (q?.trim()) {
      contacts = filterContactsByQuery(q, contacts);
    }
    if (limit == null) return contacts;
    return contacts.slice(offset, offset + limit);
  }

  const { supabase, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext();
  if (!supabase) return [];

  const workspaceIds = allGroups
    ? (await listUserWorkspaces(supabase)).map((workspace) => workspace.id)
    : activeWorkspaceId
      ? [activeWorkspaceId]
      : [];

  if (!workspaceIds.length) return [];

  let query = supabase
    .from("contacts")
    .select("*")
    .in("workspace_id", workspaceIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

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

  const { data, error } = await supabase.from("contacts").select("*").in("id", uniqueIds);
  if (error) throw error;
  return (data ?? []) as Contact[];
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
      "id, full_name, title, email, company_name, owner:profiles!contacts_owner_id_fkey(name, email), workspace:workspaces(name)",
    )
    .in("workspace_id", workspaceIds)
    .or(
      `full_name.ilike.%${query}%,title.ilike.%${query}%,company_name.ilike.%${query}%,email.ilike.%${query}%`,
    )
    .limit(20);

  if (options?.ownerId) {
    textQuery = textQuery.eq("owner_id", options.ownerId);
  }

  const { data: textMatches } = await textQuery;

  return (textMatches ?? []).map((c, i) => {
    const row = c as SearchContactMatch & {
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
  return {
    full_name: row.full_name,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    email: row.email?.trim() || null,
    title: row.title ?? null,
    company_name: row.company_name ?? null,
    phone: row.phone ?? null,
    linkedin_url: row.linkedin_url ?? null,
    twitter_url: row.twitter_url ?? null,
    location: row.location ?? null,
    external_id: row.external_id ?? null,
  };
}

export async function importContactsFromSource(
  rows: ImportRow[],
  source: import("@/types").SyncSource,
  options?: ImportOptions,
) {
  if (isDataDemoMode()) return importDemoContacts(rows);

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  const skipEmbeddings = options?.skipEmbeddings === true || source === "csv";
  const importBatchId = options?.importBatchId;
  const metadataBase: Record<string, unknown> = {};
  if (importBatchId) metadataBase.import_batch_id = importBatchId;
  if (options?.fileName) metadataBase.file_name = options.fileName;
  if (options?.sheetName) metadataBase.sheet_name = options.sheetName;

  // Fast path for CSV / large imports: bulk insert, no per-row AI embeddings.
  if (skipEmbeddings) {
    return bulkImportContacts(supabase, {
      rows,
      source,
      workspaceId,
      ownerId: user.id,
      metadata: metadataBase,
    });
  }

  let imported = 0;
  let updated = 0;

  for (const row of rows) {
    const embedding = await buildContactEmbedding(row);
    const metadata = rowMetadata(row, metadataBase);
    const fields = rowDbFields(row);

    if (row.external_id) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("external_id", row.external_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("contacts")
          .update({
            ...fields,
            embedding,
            source,
            metadata,
          })
          .eq("id", existing.id);
        updated += 1;
        continue;
      }
    } else if (row.email) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", row.email)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("contacts")
          .update({
            ...fields,
            embedding,
            source,
            metadata,
          })
          .eq("id", existing.id);
        updated += 1;
        continue;
      }
    }

    const { error } = await supabase.from("contacts").insert({
      ...fields,
      workspace_id: workspaceId,
      owner_id: user.id,
      source,
      tags: ["imported"],
      embedding,
      metadata,
    });

    if (!error) imported += 1;
  }

  return { imported, updated, duplicates: 0 };
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

  const emails = [
    ...new Set(
      rows.map((r) => r.email?.trim()).filter((e): e is string => Boolean(e)),
    ),
  ];

  const existingByEmail = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 500) {
    const slice = emails.slice(i, i + 500);
    const { data } = await supabase
      .from("contacts")
      .select("id, email")
      .eq("workspace_id", workspaceId)
      .in("email", slice);
    for (const row of data ?? []) {
      if (row.email) existingByEmail.set(String(row.email).toLowerCase(), row.id);
    }
  }

  const toInsert: Array<Record<string, unknown>> = [];
  const toUpdate: Array<{ id: string; row: ImportRow }> = [];

  for (const row of rows) {
    const emailKey = row.email?.trim().toLowerCase();
    const existingId = emailKey ? existingByEmail.get(emailKey) : undefined;
    if (existingId && existingId !== "pending") {
      toUpdate.push({ id: existingId, row });
      continue;
    }
    if (existingId === "pending") {
      continue;
    }
    toInsert.push({
      ...rowDbFields(row),
      workspace_id: workspaceId,
      owner_id: ownerId,
      source,
      tags: ["imported"],
      metadata: rowMetadata(row, metadata),
    });
    if (emailKey) existingByEmail.set(emailKey, "pending");
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
      wave.map(({ id, row }) =>
        supabase
          .from("contacts")
          .update({
            ...rowDbFields(row),
            source,
            metadata: rowMetadata(row, metadata),
          })
          .eq("id", id),
      ),
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
