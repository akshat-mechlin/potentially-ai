import { isDataDemoMode } from "@/lib/app-config";
import { getUserWorkspaceContext } from "./workspace";

export async function getAdminData() {
  if (isDataDemoMode()) {
    return {
      users: [
        { name: "Alex Morgan", email: "demo@potentially.ai", workspaces: 1, admin: false },
        { name: "Admin User", email: "admin@potentially.ai", workspaces: 1, admin: true },
      ],
      workspaces: [{ name: "Acme Ventures", members: 1, plan: "pro", contacts: 3 }],
      featureFlags: [
        { key: "ai_search", enabled: true, description: "AI-powered network search" },
        { key: "graph_view", enabled: true, description: "Interactive network graph" },
        { key: "outreach_engine", enabled: true, description: "AI outreach message generation" },
        { key: "team_collaboration", enabled: true, description: "Group invites and team features" },
        { key: "beta_connectors", enabled: false, description: "Beta connector integrations" },
        { key: "billing_enforcement", enabled: true, description: "Enforce plan limits on search and imports" },
      ],
    };
  }

  const { supabase, user, profile } = await getUserWorkspaceContext();
  if (!supabase || !user) throw new Error("Unauthorized");
  if (!profile?.is_admin) throw new Error("Forbidden");

  const [{ data: users }, { data: workspaces }, { data: flags }] = await Promise.all([
    supabase.from("profiles").select("id, name, email, is_admin").order("created_at", {
      ascending: false,
    }),
    supabase.from("workspaces").select("id, name, plan"),
    supabase.from("feature_flags").select("key, enabled, description"),
  ]);

  const workspaceRows = await Promise.all(
    (workspaces ?? []).map(async (ws) => {
      const [{ count: members }, { count: contacts }] = await Promise.all([
        supabase
          .from("workspace_members")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", ws.id),
        supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", ws.id),
      ]);
      return {
        name: ws.name,
        members: members ?? 0,
        plan: ws.plan,
        contacts: contacts ?? 0,
      };
    }),
  );

  const enrichedUsers = await Promise.all(
    (users ?? []).map(async (u) => {
      const { count } = await supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", u.id);
      return {
        name: u.name || u.email,
        email: u.email,
        workspaces: count ?? 0,
        admin: u.is_admin,
      };
    }),
  );

  return {
    users: enrichedUsers,
    workspaces: workspaceRows,
    featureFlags: flags ?? [],
  };
}

export async function updateFeatureFlag(key: string, enabled: boolean) {
  if (isDataDemoMode()) return { key, enabled };

  const { supabase, profile } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { data, error } = await supabase
    .from("feature_flags")
    .update({ enabled })
    .eq("key", key)
    .select()
    .single();

  if (error) throw error;
  return data;
}
