import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isDataDemoMode } from "@/lib/app-config";
import { DEMO_WORKSPACE } from "@/lib/demo-data";
import { safeGetUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole, WorkspaceSummary, Workspace } from "@/types";

type WorkspaceSupabase = Awaited<ReturnType<typeof createClient>>;

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata ?? {};
  return (
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "My"
  );
}

async function fetchWorkspaceId(supabase: WorkspaceSupabase, userId: string) {
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return membership?.workspace_id ?? null;
}

async function ensureUserProfile(supabase: WorkspaceSupabase, user: User) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      name: displayNameFromUser(user),
      avatar_url:
        typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }
}

async function ensureDefaultWorkspace(
  supabase: WorkspaceSupabase,
  user: User,
): Promise<string | null> {
  const existing = await fetchWorkspaceId(supabase, user.id);
  if (existing) return existing;

  await ensureUserProfile(supabase, user);

  const { data: onboardedId, error: onboardError } = await supabase.rpc("ensure_user_onboarded");

  if (!onboardError && onboardedId) {
    return onboardedId as string;
  }

  if (onboardError && !onboardError.message.includes("Could not find the function")) {
    console.error("ensure_user_onboarded failed:", onboardError.message);
  }

  const workspaceName = `${displayNameFromUser(user)}'s Group`;
  const { data, error } = await supabase.rpc("create_workspace_with_owner", {
    workspace_name: workspaceName,
  });

  if (error) {
    console.error("Failed to create default workspace:", error.message);
    return fetchWorkspaceId(supabase, user.id);
  }

  return (data as { id: string } | null)?.id ?? null;
}

async function resolveWorkspaceId(
  supabase: WorkspaceSupabase,
  userId: string,
  preferredWorkspaceId?: string | null,
) {
  if (preferredWorkspaceId) {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("workspace_id", preferredWorkspaceId)
      .maybeSingle();

    if (membership?.workspace_id) {
      return membership.workspace_id;
    }
  }

  let workspaceId = await fetchWorkspaceId(supabase, userId);
  if (!workspaceId) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      workspaceId = await ensureDefaultWorkspace(supabase, userData.user);
    }
  }

  return workspaceId;
}

export async function listUserWorkspaces(
  existingSupabase?: WorkspaceSupabase,
): Promise<WorkspaceSummary[]> {
  if (isDataDemoMode()) {
    return [
      {
        ...DEMO_WORKSPACE,
        role: "owner",
        member_count: 3,
      },
    ];
  }

  const supabase = existingSupabase ?? (await createClient());
  const { user } = await safeGetUser(supabase);
  if (!user) return [];

  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      "role, workspace:workspaces(id, name, slug, logo_url, plan, created_at, updated_at)",
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []).filter((row) => row.workspace);
  const workspaceIds = rows
    .map((row) => {
      const workspace = row.workspace as Workspace | Workspace[] | null;
      const item = Array.isArray(workspace) ? workspace[0] : workspace;
      return item?.id;
    })
    .filter((id): id is string => Boolean(id));

  const memberCounts = new Map<string, number>();
  if (workspaceIds.length > 0) {
    const { data: counts } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .in("workspace_id", workspaceIds);

    for (const id of workspaceIds) {
      memberCounts.set(
        id,
        (counts ?? []).filter((row) => row.workspace_id === id).length,
      );
    }
  }

  return rows.map((row) => {
    const workspaceRaw = row.workspace as Workspace | Workspace[] | null;
    const workspace = Array.isArray(workspaceRaw) ? workspaceRaw[0] : workspaceRaw;
    if (!workspace) {
      throw new Error("Group data missing from membership row");
    }
    return {
      ...workspace,
      role: row.role as WorkspaceRole,
      member_count: memberCounts.get(workspace.id) ?? 1,
    };
  });
}

export async function getUserWorkspaceIds(
  existingSupabase?: WorkspaceSupabase,
): Promise<string[]> {
  const supabase = existingSupabase ?? (await createClient());
  const workspaces = await listUserWorkspaces(supabase);
  return workspaces.map((workspace) => workspace.id);
}

export async function getUserWorkspaceContext(
  existingSupabase?: WorkspaceSupabase,
  preferredWorkspaceId?: string | null,
) {
  if (isDataDemoMode()) {
    return {
      supabase: null,
      user: { id: "demo-user-001", email: "demo@potentially.ai" },
      workspaceId: DEMO_WORKSPACE.id,
      profile: { name: "Alex Morgan", is_admin: false },
    };
  }

  const supabase = existingSupabase ?? (await createClient());
  const { user } = await safeGetUser(supabase);

  if (!user) {
    return { supabase, user: null, workspaceId: null, profile: null };
  }

  await ensureUserProfile(supabase, user).catch((error) => {
    console.error("Profile ensure failed:", error);
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, is_admin, email")
    .eq("id", user.id)
    .maybeSingle();

  const workspaceId = await resolveWorkspaceId(supabase, user.id, preferredWorkspaceId);

  return {
    supabase,
    user,
    workspaceId,
    profile,
  };
}
