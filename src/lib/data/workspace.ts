import type { User } from "@supabase/supabase-js";
import { isDataDemoMode } from "@/lib/app-config";
import { DEMO_WORKSPACE } from "@/lib/demo-data";
import { safeGetSessionUser, type SessionUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole, WorkspaceSummary, Workspace } from "@/types";

type WorkspaceSupabase = Awaited<ReturnType<typeof createClient>>;

function displayNameFromSessionUser(user: SessionUser): string {
  return user.email?.split("@")[0] || "My";
}

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata ?? {};
  return (
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "My"
  );
}

function toContextUser(user: SessionUser) {
  return { id: user.id, email: user.email ?? "" };
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

async function ensureUserProfile(supabase: WorkspaceSupabase, user: SessionUser) {
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
      name: displayNameFromSessionUser(user),
      avatar_url: null,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }
}

async function ensureDefaultWorkspace(
  supabase: WorkspaceSupabase,
  user: SessionUser,
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

  const { data: userData } = await supabase.auth.getUser();
  const workspaceName = userData.user
    ? `${displayNameFromUser(userData.user)}'s Group`
    : `${displayNameFromSessionUser(user)}'s Group`;

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
  user: SessionUser,
  preferredWorkspaceId?: string | null,
) {
  if (preferredWorkspaceId) {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .eq("workspace_id", preferredWorkspaceId)
      .maybeSingle();

    if (membership?.workspace_id) {
      return membership.workspace_id;
    }
  }

  let workspaceId = await fetchWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    workspaceId = await ensureDefaultWorkspace(supabase, user);
  }

  return workspaceId;
}

async function fetchWorkspaceMemberCounts(
  supabase: WorkspaceSupabase,
  workspaceIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!workspaceIds.length) return counts;

  const { data, error } = await supabase.rpc("get_workspace_member_counts", {
    p_workspace_ids: workspaceIds,
  });

  if (error) throw error;

  const record = (data ?? {}) as Record<string, number>;
  for (const id of workspaceIds) {
    counts.set(id, record[id] ?? 1);
  }

  return counts;
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
  const { user } = await safeGetSessionUser(supabase);
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

  const memberCounts = await fetchWorkspaceMemberCounts(supabase, workspaceIds);

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
  const { user: sessionUser } = await safeGetSessionUser(supabase);

  if (!sessionUser) {
    return { supabase, user: null, workspaceId: null, profile: null };
  }

  const user = toContextUser(sessionUser);

  await ensureUserProfile(supabase, sessionUser).catch((error) => {
    console.error("Profile ensure failed:", error);
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, is_admin, email")
    .eq("id", user.id)
    .maybeSingle();

  const workspaceId = await resolveWorkspaceId(supabase, sessionUser, preferredWorkspaceId);

  return {
    supabase,
    user,
    workspaceId,
    profile,
  };
}
