import { isDataDemoMode } from "@/lib/app-config";
import {
  formatLastSync,
  getConnectionContactCount,
  syncProviderContacts,
} from "@/lib/data/connections";
import type { Notification, OAuthConnection, SyncJob } from "@/types";
import { workspaceInviteEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { getAppUrl } from "@/lib/supabase/admin";
import { getUserWorkspaceContext } from "./workspace";

export async function listNotifications(): Promise<Notification[]> {
  if (isDataDemoMode()) return [];

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markNotificationsRead(ids?: string[]) {
  if (isDataDemoMode()) return;

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return;

  let query = supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
  if (ids?.length) query = query.in("id", ids);
  await query;
}

export async function listWorkspaceMembers(workspaceId?: string | null): Promise<
  Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    connections_count: number;
    avatar_url: string | null;
    title: string | null;
  }>
> {
  if (isDataDemoMode()) {
    return [
      {
        id: "demo-user-001",
        name: "Alex Morgan",
        email: "alex@acme.com",
        role: "Owner",
        connections_count: 342,
        avatar_url: null,
        title: "CEO",
      },
      {
        id: "demo-user-002",
        name: "Jordan Lee",
        email: "jordan@acme.com",
        role: "Admin",
        connections_count: 156,
        avatar_url: null,
        title: "Partnerships",
      },
      {
        id: "demo-user-003",
        name: "Sam Taylor",
        email: "sam@acme.com",
        role: "Member",
        connections_count: 89,
        avatar_url: null,
        title: null,
      },
    ];
  }

  const { supabase, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext(
    undefined,
    workspaceId,
  );
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
  if (!supabase || !targetWorkspaceId) return [];

  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      "role, user_id, profile:profiles!workspace_members_user_id_fkey(name, email, avatar_url, title)",
    )
    .eq("workspace_id", targetWorkspaceId);

  if (error) throw error;

  const { data: contactRows } = await supabase
    .from("contacts")
    .select("owner_id")
    .eq("workspace_id", targetWorkspaceId);

  const connectionsByOwner = new Map<string, number>();
  for (const row of contactRows ?? []) {
    if (!row.owner_id) continue;
    connectionsByOwner.set(row.owner_id, (connectionsByOwner.get(row.owner_id) ?? 0) + 1);
  }

  return (data ?? []).map((row) => {
    const profile = row.profile as {
      name?: string;
      email?: string;
      avatar_url?: string | null;
      title?: string | null;
    } | null;
    const userId = row.user_id as string;
    return {
      id: userId,
      name: profile?.name || profile?.email || "Member",
      email: profile?.email || "",
      role: capitalizeRole(row.role as string),
      connections_count: connectionsByOwner.get(userId) ?? 0,
      avatar_url: profile?.avatar_url ?? null,
      title: profile?.title ?? null,
    };
  });
}

export async function listOAuthConnections(): Promise<
  Array<{
    provider: string;
    status: string;
    lastSync: string;
    contacts: number;
    connected: boolean;
  }>
> {
  if (isDataDemoMode()) {
    return [
      { provider: "Google", status: "active", lastSync: "2 hours ago", contacts: 342, connected: true },
      { provider: "Outlook", status: "active", lastSync: "1 day ago", contacts: 156, connected: true },
      { provider: "CSV Import", status: "completed", lastSync: "3 days ago", contacts: 89, connected: true },
    ];
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId || !user) return defaultConnections();

  const [{ data: connections }, googleCount, outlookCount, csvCount] = await Promise.all([
    supabase
      .from("oauth_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id),
    getConnectionContactCount(supabase, workspaceId, "google_contacts"),
    getConnectionContactCount(supabase, workspaceId, "outlook"),
    getConnectionContactCount(supabase, workspaceId, "csv"),
  ]);

  const rows = defaultConnections().map((row) => {
    if (row.provider === "CSV Import") {
      return {
        ...row,
        status: csvCount > 0 ? "completed" : "pending",
        contacts: csvCount,
        connected: csvCount > 0,
        lastSync: csvCount > 0 ? row.lastSync : "Never",
      };
    }

    const dbProvider = row.provider === "Outlook" ? "outlook" : "google";
    const match = (connections as OAuthConnection[] | null)?.find((c) => c.provider === dbProvider);
    const contactCount = row.provider === "Google" ? googleCount : outlookCount;

    if (!match || match.status !== "active") {
      return {
        ...row,
        status: "pending",
        lastSync: "Never",
        contacts: contactCount,
        connected: false,
      };
    }

    return {
      ...row,
      status: match.status,
      lastSync: formatLastSync(match.last_synced_at),
      contacts: contactCount,
      connected: true,
    };
  });

  return rows;
}

function defaultConnections() {
  return [
    { provider: "Google", status: "pending", lastSync: "Never", contacts: 0, connected: false },
    { provider: "Outlook", status: "pending", lastSync: "Never", contacts: 0, connected: false },
    { provider: "CSV Import", status: "pending", lastSync: "Never", contacts: 0, connected: false },
  ];
}

export async function createSyncJob(source: string) {
  if (isDataDemoMode()) {
    const { startDemoSync } = await import("@/lib/demo-store");
    const job = startDemoSync(source);
    return {
      job_id: job.id,
      source,
      status: "completed" as const,
      message: `Sync completed for ${source} (demo mode)`,
    };
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  const normalized = normalizeSource(source);

  const { data: job, error } = await supabase
    .from("sync_jobs")
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      source: normalized,
      status: "pending",
      progress: 0,
      total: 100,
    })
    .select()
    .single();

  if (error) throw error;

  if (normalized === "csv") {
    await completeSyncJob(supabase, job as SyncJob, normalized);
    return {
      job_id: job.id,
      source: normalized,
      status: "completed" as const,
      message: "Import contacts using the CSV Import button, or go to the Contacts page.",
    };
  }

  const provider = normalized === "outlook" ? "outlook" : "google";
  const dbProvider = provider === "outlook" ? "outlook" : "google";

  const { data: connection } = await supabase
    .from("oauth_connections")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("provider", dbProvider)
    .maybeSingle();

  if (!connection || connection.status !== "active") {
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        error: "OAuth not connected",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return {
      job_id: job.id,
      source: normalized,
      status: "failed" as const,
      needs_connect: true,
      message: `Connect ${provider === "outlook" ? "Outlook" : "Google"} first, then sync again.`,
    };
  }

  await supabase
    .from("sync_jobs")
    .update({ status: "running", started_at: new Date().toISOString(), progress: 50 })
    .eq("id", job.id);

  try {
    const syncResult = await syncProviderContacts(normalized as import("@/types").SyncSource);
    await completeSyncJob(supabase, job as SyncJob, normalized);

    return {
      job_id: job.id,
      source: normalized,
      status: "completed" as const,
      message: `Synced ${syncResult.imported} new and ${syncResult.updated} updated contacts from ${provider}.`,
      ...syncResult,
    };
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "Sync failed";
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        error: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return {
      job_id: job.id,
      source: normalized,
      status: "failed" as const,
      message,
    };
  }
}

async function completeSyncJob(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  job: SyncJob,
  source: string,
) {
  await supabase
    .from("sync_jobs")
    .update({
      status: "completed",
      progress: 100,
      total: 100,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  await supabase.from("notifications").insert({
    user_id: job.user_id,
    workspace_id: job.workspace_id,
    title: "Sync completed",
    message: `Your ${source.replace("_", " ")} sync has finished.`,
    type: "sync",
    link: "/groups",
  });

  await supabase.from("activities").insert({
    workspace_id: job.workspace_id,
    user_id: job.user_id,
    event: "sync_completed",
    entity_type: "sync_job",
    entity_id: job.id,
    metadata: { source },
  });
}

export async function inviteWorkspaceMember(
  email: string,
  role = "member",
  workspaceId?: string | null,
) {
  if (isDataDemoMode()) {
    return { success: true, message: `Invite sent to ${email} (demo mode)` };
  }

  const { supabase, user, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext(
    undefined,
    workspaceId,
  );
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
  if (!supabase || !user || !targetWorkspaceId) throw new Error("Unauthorized");

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: targetWorkspaceId,
    email,
    role,
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  });

  if (error) throw error;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", targetWorkspaceId)
    .single();

  const inviteLink = `${getAppUrl()}/signup?invite=${token}`;
  const template = workspaceInviteEmail(workspace?.name ?? "your team", inviteLink);

  try {
    await sendEmail({ to: email, subject: template.subject, html: template.html });
  } catch (emailError) {
    console.error("Workspace invite email failed:", emailError);
  }

  await supabase.from("notifications").insert({
    user_id: user.id,
    workspace_id: targetWorkspaceId,
    title: "Invite sent",
    message: `Invitation sent to ${email}`,
    type: "invite",
    link: "/groups",
  });

  return { success: true, message: `Invitation sent to ${email}` };
}

export async function getOrCreateWorkspaceInviteLink(workspaceId?: string | null) {
  if (isDataDemoMode()) {
    return {
      workspaceName: "Acme Ventures",
      inviteLink: `${getAppUrl()}/invite?token=demo-workspace-token`,
    };
  }

  const { supabase, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext(
    undefined,
    workspaceId,
  );
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
  if (!supabase || !targetWorkspaceId) throw new Error("Unauthorized");

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, name, invite_token")
    .eq("id", targetWorkspaceId)
    .single();

  if (error || !workspace) throw error ?? new Error("Workspace not found");

  let inviteToken = workspace.invite_token as string | null;
  if (!inviteToken) {
    inviteToken = crypto.randomUUID();
    const { error: updateError } = await supabase
      .from("workspaces")
      .update({ invite_token: inviteToken })
      .eq("id", targetWorkspaceId);

    if (updateError) throw updateError;
  }

  return {
    workspaceName: workspace.name as string,
    inviteLink: `${getAppUrl()}/invite?token=${inviteToken}`,
  };
}

export async function inviteWorkspaceMembers(
  emails: string[],
  workspaceId?: string | null,
  role = "member",
) {
  const uniqueEmails = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  const results = await Promise.allSettled(
    uniqueEmails.map((email) => inviteWorkspaceMember(email, role, workspaceId)),
  );

  const sent = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - sent;

  if (sent === 0 && failed > 0) {
    throw new Error("Failed to send invites");
  }

  return {
    success: true,
    sent,
    failed,
    message:
      sent === 1
        ? `Invitation sent to ${uniqueEmails[0]}`
        : `Invitations sent to ${sent} people${failed > 0 ? ` (${failed} failed)` : ""}`,
  };
}

export async function joinWorkspaceFromInviteToken(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  token: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await getUserWorkspaceContext(supabase);

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("invite_token", token)
    .maybeSingle();

  if (workspace) {
    const { error } = await supabase.from("workspace_members").upsert(
      {
        workspace_id: workspace.id,
        user_id: user.id,
        role: "member",
      },
      { onConflict: "workspace_id,user_id", ignoreDuplicates: true },
    );
    if (error) throw error;
    return workspace;
  }

  const { data: invite } = await supabase
    .from("workspace_invites")
    .select("workspace_id, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.accepted_at) return null;
  if (new Date(invite.expires_at) < new Date()) return null;

  const { error: memberError } = await supabase.from("workspace_members").upsert(
    {
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: invite.role,
    },
    { onConflict: "workspace_id,user_id", ignoreDuplicates: true },
  );
  if (memberError) throw memberError;

  await supabase
    .from("workspace_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token);

  const { data: invitedWorkspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", invite.workspace_id)
    .single();

  return invitedWorkspace;
}

function normalizeSource(source: string) {
  const aliases: Record<string, string> = {
    google: "google_contacts",
    google_contacts: "google_contacts",
    google_calendar: "google_calendar",
    gmail: "gmail",
    outlook: "outlook",
    outlook_mail: "outlook_mail",
    csv: "csv",
    csv_import: "csv",
  };
  return aliases[source] ?? "google_contacts";
}

function capitalizeRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
