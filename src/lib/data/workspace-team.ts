import { isDataDemoMode } from "@/lib/app-config";
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

export async function listWorkspaceMembers(): Promise<
  Array<{ name: string; email: string; role: string }>
> {
  if (isDataDemoMode()) {
    return [
      { name: "Alex Morgan", email: "alex@acme.com", role: "Owner" },
      { name: "Jordan Lee", email: "jordan@acme.com", role: "Admin" },
      { name: "Sam Taylor", email: "sam@acme.com", role: "Member" },
    ];
  }

  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) return [];

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, profile:profiles(name, email)")
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = row.profile as { name?: string; email?: string } | null;
    return {
      name: profile?.name || profile?.email || "Member",
      email: profile?.email || "",
      role: capitalizeRole(row.role as string),
    };
  });
}

export async function listOAuthConnections(): Promise<
  Array<{ provider: string; status: string; lastSync: string; contacts: number }>
> {
  if (isDataDemoMode()) {
    return [
      { provider: "Google", status: "active", lastSync: "2 hours ago", contacts: 342 },
      { provider: "Outlook", status: "active", lastSync: "1 day ago", contacts: 156 },
      { provider: "CSV Import", status: "completed", lastSync: "3 days ago", contacts: 89 },
    ];
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) return defaultConnections();

  const [{ data: connections }, { count: csvCount }] = await Promise.all([
    supabase
      .from("oauth_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user!.id),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("source", "csv"),
  ]);

  const rows = defaultConnections().map((row) => {
    const match = (connections as OAuthConnection[] | null)?.find((c) =>
      row.provider.toLowerCase().includes(c.provider),
    );
    if (!match) {
      return { ...row, status: "pending", lastSync: "Never", contacts: 0 };
    }
    return {
      ...row,
      status: match.status,
      lastSync: match.last_synced_at
        ? new Date(match.last_synced_at).toLocaleDateString()
        : "Never",
      contacts: row.provider === "CSV Import" ? (csvCount ?? 0) : row.contacts,
    };
  });

  return rows;
}

function defaultConnections() {
  return [
    { provider: "Google", status: "pending", lastSync: "Never", contacts: 0 },
    { provider: "Outlook", status: "pending", lastSync: "Never", contacts: 0 },
    { provider: "CSV Import", status: "completed", lastSync: "Never", contacts: 0 },
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
      message: "CSV contacts are imported from the Contacts page.",
    };
  }

  const { data: connection } = await supabase
    .from("oauth_connections")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("provider", normalized === "outlook" ? "outlook" : "google")
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
      message: `Connect ${normalized === "outlook" ? "Outlook" : "Google"} in Supabase Auth, then retry sync.`,
    };
  }

  await supabase
    .from("sync_jobs")
    .update({ status: "running", started_at: new Date().toISOString(), progress: 50 })
    .eq("id", job.id);

  await completeSyncJob(supabase, job as SyncJob, normalized);

  return {
    job_id: job.id,
    source: normalized,
    status: "completed" as const,
    message: `${normalized} sync job completed.`,
  };
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
    link: "/workspace",
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

export async function inviteWorkspaceMember(email: string, role = "member") {
  if (isDataDemoMode()) {
    return { success: true, message: `Invite sent to ${email} (demo mode)` };
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: workspaceId,
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
    .eq("id", workspaceId)
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
    workspace_id: workspaceId,
    title: "Invite sent",
    message: `Invitation sent to ${email}`,
    type: "invite",
    link: "/workspace",
  });

  return { success: true, message: `Invitation sent to ${email}` };
}

function normalizeSource(source: string) {
  const aliases: Record<string, string> = {
    google: "google_contacts",
    google_contacts: "google_contacts",
    google_calendar: "google_calendar",
    gmail: "gmail",
    outlook: "outlook",
    outlook_mail: "outlook",
    csv: "csv",
    csv_import: "csv",
  };
  return aliases[source] ?? "google_contacts";
}

function capitalizeRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
