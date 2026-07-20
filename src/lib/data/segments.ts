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
import { getContactsByIds } from "@/lib/data/contacts";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import type { WorkflowActor } from "@/lib/workflows/actor";
import type { Contact } from "@/types";
import type { Segment } from "@/types/playbooks";

async function resolveSegmentClient(actor?: WorkflowActor | null) {
  if (actor) {
    return { supabase: actor.supabase, userId: actor.userId, workspaceId: actor.workspaceId };
  }
  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");
  return { supabase, userId: user.id, workspaceId };
}

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

export async function createSegment(
  input: {
    name: string;
    description?: string;
    contactIds?: string[];
    workspaceId?: string | null;
  },
  actor?: WorkflowActor | null,
) {
  if (isDataDemoMode()) {
    return createDemoSegment(input.name, input.description, input.contactIds ?? []);
  }

  const ctx = actor
    ? { supabase: actor.supabase, userId: actor.userId, workspaceId: actor.workspaceId }
    : await (async () => {
        const { supabase, user, workspaceId } = await getUserWorkspaceContext(
          undefined,
          input.workspaceId,
        );
        if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");
        return { supabase, userId: user.id, workspaceId };
      })();

  const { data: segment, error } = await ctx.supabase
    .from("segments")
    .insert({
      workspace_id: ctx.workspaceId,
      created_by: ctx.userId,
      name: input.name,
      description: input.description ?? null,
      contact_count: input.contactIds?.length ?? 0,
    })
    .select("*")
    .single();

  if (error) throw error;

  if (input.contactIds?.length) {
    await ctx.supabase.from("segment_contacts").insert(
      input.contactIds.map((contactId) => ({
        segment_id: segment.id,
        contact_id: contactId,
      })),
    );
  }

  return segment as Segment;
}

export async function getSegment(
  segmentId: string,
  actor?: WorkflowActor | null,
): Promise<Segment | null> {
  if (isDataDemoMode()) return getDemoSegment(segmentId);

  const { supabase } = actor
    ? { supabase: actor.supabase }
    : await getUserWorkspaceContext();
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
  const contacts = await getContactsByIds(contactIds);

  return { segment, contacts };
}

export async function updateSegment(
  segmentId: string,
  input: { name?: string; description?: string | null },
  actor?: WorkflowActor | null,
): Promise<Segment | null> {
  if (isDataDemoMode()) return updateDemoSegment(segmentId, input);

  const { supabase } = await resolveSegmentClient(actor);

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

export async function setSegmentContacts(
  segmentId: string,
  contactIds: string[],
  actor?: WorkflowActor | null,
) {
  if (isDataDemoMode()) {
    const { setDemoSegmentContacts } = await import("@/lib/demo-store/playbooks");
    setDemoSegmentContacts(segmentId, contactIds);
    return;
  }

  const { supabase } = await resolveSegmentClient(actor);

  await supabase.from("segment_contacts").delete().eq("segment_id", segmentId);

  const unique = [...new Set(contactIds)];
  if (unique.length) {
    const CHUNK = 200;
    for (let i = 0; i < unique.length; i += CHUNK) {
      const slice = unique.slice(i, i + CHUNK);
      const { error } = await supabase.from("segment_contacts").insert(
        slice.map((contactId) => ({ segment_id: segmentId, contact_id: contactId })),
      );
      if (error) throw error;
    }
  }

  await supabase
    .from("segments")
    .update({ contact_count: unique.length, updated_at: new Date().toISOString() })
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
