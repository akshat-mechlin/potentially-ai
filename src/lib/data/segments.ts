import { isDataDemoMode } from "@/lib/app-config";
import {
  getDemoSegments,
  createDemoSegment,
  addContactsToDemoSegment,
  getDemoSegmentContactIds,
  getDemoSegment,
  updateDemoSegment,
  removeContactsFromDemoSegment,
  deleteDemoSegment,
} from "@/lib/demo-store/playbooks";
import { listContacts } from "@/lib/data/contacts";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import type { Contact } from "@/types";
import type { Segment } from "@/types/playbooks";

export async function listSegments(workspaceId?: string | null): Promise<Segment[]> {
  if (isDataDemoMode()) return getDemoSegments();

  const { supabase, workspaceId: activeId } = await getUserWorkspaceContext(undefined, workspaceId);
  const targetId = workspaceId ?? activeId;
  if (!supabase || !targetId) return [];

  const { data, error } = await supabase
    .from("segments")
    .select("*")
    .eq("workspace_id", targetId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Segment[];
}

export async function createSegment(input: {
  name: string;
  description?: string;
  contactIds?: string[];
  workspaceId?: string | null;
}) {
  if (isDataDemoMode()) {
    return createDemoSegment(input.name, input.description, input.contactIds ?? []);
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext(undefined, input.workspaceId);
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  const { data: segment, error } = await supabase
    .from("segments")
    .insert({
      workspace_id: workspaceId,
      created_by: user.id,
      name: input.name,
      description: input.description ?? null,
      contact_count: input.contactIds?.length ?? 0,
    })
    .select("*")
    .single();

  if (error) throw error;

  if (input.contactIds?.length) {
    await supabase.from("segment_contacts").insert(
      input.contactIds.map((contactId) => ({
        segment_id: segment.id,
        contact_id: contactId,
      })),
    );
  }

  return segment as Segment;
}

export async function getSegment(segmentId: string): Promise<Segment | null> {
  if (isDataDemoMode()) return getDemoSegment(segmentId);

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return null;

  const { data, error } = await supabase.from("segments").select("*").eq("id", segmentId).maybeSingle();
  if (error) throw error;
  return (data as Segment | null) ?? null;
}

export async function getSegmentWithContacts(segmentId: string): Promise<{
  segment: Segment;
  contacts: Contact[];
} | null> {
  const segment = await getSegment(segmentId);
  if (!segment) return null;

  const contactIds = await getSegmentContactIds(segmentId);
  const allContacts = await listContacts();
  const idSet = new Set(contactIds);
  const contacts = allContacts.filter((c) => idSet.has(c.id));

  return { segment, contacts };
}

export async function updateSegment(
  segmentId: string,
  input: { name?: string; description?: string | null },
): Promise<Segment | null> {
  if (isDataDemoMode()) return updateDemoSegment(segmentId, input);

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;

  const { data, error } = await supabase
    .from("segments")
    .update(patch)
    .eq("id", segmentId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return (data as Segment | null) ?? null;
}

export async function getSegmentContactIds(segmentId: string): Promise<string[]> {
  if (isDataDemoMode()) {
    return getDemoSegmentContactIds(segmentId);
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("segment_contacts")
    .select("contact_id")
    .eq("segment_id", segmentId);

  if (error) throw error;
  return (data ?? []).map((row) => row.contact_id as string);
}

export async function addContactsToSegment(segmentId: string, contactIds: string[]) {
  if (isDataDemoMode()) {
    addContactsToDemoSegment(segmentId, contactIds);
    return;
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  const unique = [...new Set(contactIds)];
  if (!unique.length) return;

  await supabase.from("segment_contacts").upsert(
    unique.map((contactId) => ({ segment_id: segmentId, contact_id: contactId })),
    { onConflict: "segment_id,contact_id", ignoreDuplicates: true },
  );

  const { count } = await supabase
    .from("segment_contacts")
    .select("*", { count: "exact", head: true })
    .eq("segment_id", segmentId);

  await supabase
    .from("segments")
    .update({ contact_count: count ?? 0, updated_at: new Date().toISOString() })
    .eq("id", segmentId);
}

export async function removeContactsFromSegment(segmentId: string, contactIds: string[]) {
  if (isDataDemoMode()) {
    removeContactsFromDemoSegment(segmentId, contactIds);
    return;
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  const unique = [...new Set(contactIds)];
  if (!unique.length) return;

  await supabase.from("segment_contacts").delete().eq("segment_id", segmentId).in("contact_id", unique);

  const { count } = await supabase
    .from("segment_contacts")
    .select("*", { count: "exact", head: true })
    .eq("segment_id", segmentId);

  await supabase
    .from("segments")
    .update({ contact_count: count ?? 0, updated_at: new Date().toISOString() })
    .eq("id", segmentId);
}

export async function deleteSegment(segmentId: string) {
  if (isDataDemoMode()) {
    deleteDemoSegment(segmentId);
    return;
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  const { error } = await supabase.from("segments").delete().eq("id", segmentId);
  if (error) throw error;
}
