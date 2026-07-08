import { isDataDemoMode } from "@/lib/app-config";
import { deleteDemoWorkspace, getDemoWorkspaceById } from "@/lib/demo-store";
import { listWorkspaceMembers } from "@/lib/data/workspace-team";
import { getUserWorkspaceContext, listUserWorkspaces } from "@/lib/data/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkspaceRole, WorkspaceSummary } from "@/types";

export type WorkspaceDetail = WorkspaceSummary & {
  contacts_count: number;
  playbooks_count: number;
  connected_accounts: number;
  joined_at: string | null;
  can_manage: boolean;
  is_owner: boolean;
  members: Awaited<ReturnType<typeof listWorkspaceMembers>>;
};

function normalizeRole(role: string): WorkspaceRole {
  if (role === "owner" || role === "admin" || role === "member" || role === "viewer") {
    return role;
  }
  return "member";
}

export async function getWorkspaceDetail(workspaceId: string): Promise<WorkspaceDetail | null> {
  if (isDataDemoMode()) {
    const demoWorkspace = getDemoWorkspaceById(workspaceId);
    if (!demoWorkspace) return null;
    const members = await listWorkspaceMembers(workspaceId);
    return {
      ...demoWorkspace,
      role: "owner",
      member_count: members.length,
      contacts_count: 847,
      playbooks_count: 2,
      connected_accounts: 2,
      joined_at: demoWorkspace.created_at,
      can_manage: true,
      is_owner: true,
      members,
    };
  }

  const { supabase, user } = await getUserWorkspaceContext(undefined, workspaceId);
  if (!supabase || !user) return null;

  const workspaces = await listUserWorkspaces(supabase);
  const summary = workspaces.find((workspace) => workspace.id === workspaceId);
  if (!summary) return null;

  const role = normalizeRole(summary.role);

  const [
    { count: contactsCount },
    { count: playbooksCount },
    { count: connectionsCount },
    { data: membershipRow },
  ] = await Promise.all([
      supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("playbooks")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("oauth_connections")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "active"),
      supabase
        .from("workspace_members")
        .select("joined_at")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const members = await listWorkspaceMembers(workspaceId);

  return {
    ...summary,
    contacts_count: contactsCount ?? 0,
    playbooks_count: playbooksCount ?? 0,
    connected_accounts: connectionsCount ?? 0,
    joined_at: (membershipRow?.joined_at as string | null) ?? null,
    can_manage: role === "owner" || role === "admin",
    is_owner: role === "owner",
    members,
  };
}

async function deleteMembershipRow(workspaceId: string, userId: string) {
  const { supabase } = await getUserWorkspaceContext(undefined, workspaceId);
  if (!supabase) return false;

  const userResult = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("user_id");

  if (!userResult.error && (userResult.data?.length ?? 0) > 0) {
    return true;
  }

  try {
    const admin = createAdminClient();
    const adminResult = await admin
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .select("user_id");
    return !adminResult.error && (adminResult.data?.length ?? 0) > 0;
  } catch (error) {
    console.error("Admin membership delete failed:", error);
    return false;
  }
}

async function deleteWorkspaceRow(workspaceId: string) {
  const { supabase } = await getUserWorkspaceContext(undefined, workspaceId);
  if (!supabase) return false;

  const userResult = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
    .select("id");

  if (!userResult.error && (userResult.data?.length ?? 0) > 0) {
    return true;
  }

  try {
    const admin = createAdminClient();
    const adminResult = await admin
      .from("workspaces")
      .delete()
      .eq("id", workspaceId)
      .select("id");
    return !adminResult.error && (adminResult.data?.length ?? 0) > 0;
  } catch (error) {
    console.error("Admin workspace delete failed:", error);
    return false;
  }
}

export async function leaveWorkspace(workspaceId: string) {
  if (isDataDemoMode()) {
    deleteDemoWorkspace(workspaceId);
    return { success: true, message: "You left the group" };
  }

  const { supabase, user } = await getUserWorkspaceContext(undefined, workspaceId);
  if (!supabase || !user) throw new Error("Unauthorized");

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("You are not a member of this group");

  if (membership.role === "owner") {
    const { count } = await supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if ((count ?? 0) > 1) {
      throw new Error(
        "Group owners cannot leave while other members remain. Transfer ownership or delete the group instead.",
      );
    }
  }

  const removed = await deleteMembershipRow(workspaceId, user.id);
  if (!removed) {
    throw new Error("Could not leave group. Please try again.");
  }

  return { success: true, message: "You left the group" };
}

export async function deleteWorkspace(workspaceId: string) {
  if (isDataDemoMode()) {
    deleteDemoWorkspace(workspaceId);
    return { success: true, message: "Group deleted" };
  }

  const { supabase, user } = await getUserWorkspaceContext(undefined, workspaceId);
  if (!supabase || !user) throw new Error("Unauthorized");

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("You are not a member of this group");
  if (membership.role !== "owner") {
    throw new Error("Only the group owner can delete this group");
  }

  const deleted = await deleteWorkspaceRow(workspaceId);
  if (!deleted) {
    throw new Error("Could not delete group. Please try again.");
  }

  return { success: true, message: "Group deleted" };
}
