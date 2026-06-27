import { isDataDemoMode } from "@/lib/app-config";
import {
  filterContactsByQuery,
  getDemoContactById,
  getDemoContacts,
  importDemoContacts,
} from "@/lib/demo-store";
import { buildContactEmbedding } from "@/lib/data/embeddings";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import type { Contact } from "@/types";

export async function listContacts(): Promise<Contact[]> {
  if (isDataDemoMode()) return getDemoContacts();

  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) return [];

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

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

export async function searchContactsForQuery(query: string) {
  if (isDataDemoMode()) {
    const contacts = filterContactsByQuery(query, getDemoContacts());
    return contacts.map((c, i) => ({
      id: c.id,
      full_name: c.full_name,
      title: c.title,
      email: c.email,
      company_name: c.company_name,
      similarity: 0.95 - i * 0.05,
    }));
  }

  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) return [];

  const { generateEmbedding } = await import("@/lib/ai/openai");
  const embedding = await generateEmbedding(query);

  const { data: vectorMatches, error } = await supabase.rpc("match_contacts", {
    query_embedding: embedding,
    match_workspace_id: workspaceId,
    match_threshold: 0.3,
    match_count: 20,
  });

  if (!error && vectorMatches && vectorMatches.length > 0) {
    return vectorMatches;
  }

  const { data: textMatches } = await supabase
    .from("contacts")
    .select("id, full_name, title, email, company_name")
    .eq("workspace_id", workspaceId)
    .or(
      `full_name.ilike.%${query}%,title.ilike.%${query}%,company_name.ilike.%${query}%,email.ilike.%${query}%`,
    )
    .limit(20);

  return (textMatches ?? []).map((c, i) => ({
    ...c,
    similarity: 0.85 - i * 0.03,
  }));
}

export async function importContacts(
  rows: Array<{
    full_name: string;
    email?: string;
    title?: string;
    company_name?: string;
  }>,
) {
  if (isDataDemoMode()) return importDemoContacts(rows);

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  const payload = await Promise.all(
    rows.map(async (row) => {
      const embedding = await buildContactEmbedding(row);
      return {
        ...row,
        workspace_id: workspaceId,
        owner_id: user.id,
        source: "csv" as const,
        tags: ["imported"],
        embedding,
      };
    }),
  );

  const { data, error } = await supabase.from("contacts").insert(payload).select();
  if (error) throw error;

  return { imported: data?.length ?? 0, duplicates: 0 };
}

export async function saveSearchHistory(query: string, result: unknown) {
  if (isDataDemoMode()) {
    const { addSearchHistory } = await import("@/lib/demo-store");
    addSearchHistory(query);
    return;
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) return;

  await supabase.from("search_history").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    query,
    result,
  });
}
