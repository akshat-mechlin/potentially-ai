import { isDataDemoMode } from "@/lib/app-config";
import {
  createDemoIntroduction,
  getDemoContactById,
  getDemoIntroductions,
} from "@/lib/demo-store";
import type { Contact, Introduction } from "@/types";
import { getUserWorkspaceContext, listUserWorkspaces } from "./workspace";

export async function listIntroductions(): Promise<Introduction[]> {
  if (isDataDemoMode()) return getDemoIntroductions();

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) throw new Error("Unauthorized");

  const workspaceIds = (await listUserWorkspaces(supabase)).map((workspace) => workspace.id);
  if (!workspaceIds.length) return [];

  const { data: rows, error } = await supabase
    .from("introductions")
    .select("*")
    .in("workspace_id", workspaceIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!rows?.length) return [];

  const contactIds = rows.map((r) => r.target_contact_id);
  const connectorIds = rows.map((r) => r.connector_id).filter(Boolean) as string[];

  const [{ data: contacts }, { data: connectors }] = await Promise.all([
    supabase.from("contacts").select("*").in("id", contactIds),
    connectorIds.length
      ? supabase.from("profiles").select("id, name").in("id", connectorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const contactMap = new Map((contacts as Contact[] | null)?.map((c) => [c.id, c]) ?? []);
  const connectorMap = new Map(
    (connectors as { id: string; name: string }[] | null)?.map((c) => [c.id, c.name]) ?? [],
  );

  return rows.map((row) => ({
    ...(row as Introduction),
    target_contact: contactMap.get(row.target_contact_id),
    connector_name: row.connector_id ? (connectorMap.get(row.connector_id) ?? null) : null,
  }));
}

export async function createIntroduction(
  targetContactId: string,
  message?: string,
): Promise<Introduction> {
  if (isDataDemoMode()) {
    const contact = getDemoContactById(targetContactId);
    if (!contact) throw new Error("Contact not found");
    const intro = createDemoIntroduction(targetContactId);
    if (!intro) throw new Error("Failed to create introduction");
    if (message) intro.message = message;
    return intro;
  }

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) throw new Error("Unauthorized");

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, full_name, workspace_id")
    .eq("id", targetContactId)
    .maybeSingle();

  if (!contact) throw new Error("Contact not found");

  const workspaceId = contact.workspace_id as string;

  const { data, error } = await supabase
    .from("introductions")
    .insert({
      workspace_id: workspaceId,
      requester_id: user.id,
      target_contact_id: targetContactId,
      status: "requested",
      message: message ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  const fullContact = await supabase.from("contacts").select("*").eq("id", targetContactId).single();

  await supabase.from("notifications").insert({
    user_id: user.id,
    workspace_id: workspaceId,
    title: "Introduction requested",
    message: `You requested an introduction to ${contact.full_name}`,
    type: "intro",
    link: "/intros",
  });

  return {
    ...(data as Introduction),
    target_contact: fullContact.data as Contact,
  };
}
