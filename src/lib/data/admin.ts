import { isDataDemoMode } from "@/lib/app-config";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getDemoAdminUsers,
  getDemoAdminWorkspaces,
  getDemoFeatureFlags,
  updateDemoFeatureFlag,
  updateDemoUserAdmin,
  updateDemoWorkspacePlan,
} from "@/lib/demo-store/admin";
import { getUserWorkspaceContext } from "./workspace";

export async function assertAdminAccess() {
  if (isDataDemoMode()) return { userId: "demo-admin-001" as string | null };

  const { user, profile } = await getUserWorkspaceContext();
  if (!user) throw new Error("Unauthorized");
  if (!profile?.is_admin) throw new Error("Forbidden");
  return { userId: user.id };
}

export async function getAdminData() {
  if (isDataDemoMode()) {
    return {
      users: getDemoAdminUsers(),
      workspaces: getDemoAdminWorkspaces(),
      featureFlags: getDemoFeatureFlags(),
    };
  }

  const { supabase } = await getUserWorkspaceContext();
  await assertAdminAccess();
  if (!supabase) throw new Error("Unauthorized");

  const [{ data: users }, { data: workspaceStats }, { data: userCounts }, { data: flags }] =
    await Promise.all([
      supabase.from("profiles").select("id, name, email, is_admin").order("created_at", {
        ascending: false,
      }),
      supabase.rpc("get_admin_workspace_stats"),
      supabase.rpc("get_admin_user_workspace_counts"),
      supabase.from("feature_flags").select("key, enabled, description").order("key"),
    ]);

  const workspaceRows = (workspaceStats ?? []).map(
    (ws: {
      workspace_id: string;
      name: string;
      plan: string;
      member_count: number;
      contact_count: number;
    }) => ({
      id: ws.workspace_id,
      name: ws.name,
      members: ws.member_count,
      plan: ws.plan,
      contacts: ws.contact_count,
    }),
  );

  const workspaceCountByUser = new Map(
    (userCounts ?? []).map((row: { user_id: string; workspace_count: number }) => [
      row.user_id,
      row.workspace_count,
    ]),
  );

  const enrichedUsers = (users ?? []).map((u) => ({
    id: u.id,
    name: u.name || u.email,
    email: u.email,
    workspaces: workspaceCountByUser.get(u.id) ?? 0,
    admin: u.is_admin,
  }));

  return {
    users: enrichedUsers,
    workspaces: workspaceRows,
    featureFlags: flags ?? [],
  };
}

export async function updateFeatureFlag(key: string, enabled: boolean) {
  await assertAdminAccess();

  if (isDataDemoMode()) {
    return updateDemoFeatureFlag(key, enabled);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("feature_flags")
    .update({ enabled })
    .eq("key", key)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserAdmin(userId: string, isAdmin: boolean, actorUserId: string | null) {
  await assertAdminAccess();

  if (actorUserId && actorUserId === userId && !isAdmin) {
    throw new Error("You cannot remove your own admin access");
  }

  if (isDataDemoMode()) {
    return updateDemoUserAdmin(userId, isAdmin);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId)
    .select("id, name, email, is_admin")
    .single();

  if (error) throw error;
  return data;
}

export async function updateWorkspacePlan(workspaceId: string, plan: string) {
  await assertAdminAccess();

  if (!["free", "pro", "enterprise"].includes(plan)) {
    throw new Error("Invalid plan");
  }

  if (isDataDemoMode()) {
    return updateDemoWorkspacePlan(workspaceId, plan);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workspaces")
    .update({ plan })
    .eq("id", workspaceId)
    .select("id, name, plan")
    .single();

  if (error) throw error;
  return data;
}
