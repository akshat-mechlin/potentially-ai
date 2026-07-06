import { isDataDemoMode } from "@/lib/app-config";
import { formatRelativeTime } from "@/lib/utils";
import { getUserWorkspaceContext, listUserWorkspaces } from "./workspace";

export type ActivityItem = {
  id: string;
  event: string;
  time: string;
  created_at: string;
};

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  if (isDataDemoMode()) {
    return [
      { id: "1", event: "Synced 47 contacts from Google", time: "2h ago", created_at: new Date().toISOString() },
      { id: "2", event: "AI search: Find CTOs in fintech", time: "5h ago", created_at: new Date().toISOString() },
      { id: "3", event: "Introduction requested to Sarah Chen", time: "1d ago", created_at: new Date().toISOString() },
      { id: "4", event: "New team member joined a group", time: "2d ago", created_at: new Date().toISOString() },
    ];
  }

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return [];

  const workspaceIds = (await listUserWorkspaces(supabase)).map((workspace) => workspace.id);
  if (!workspaceIds.length) return [];

  const [
    { data: searches },
    { data: intros },
    { data: syncJobs },
    { data: members },
    { data: connectors },
  ] = await Promise.all([
    supabase
      .from("search_history")
      .select("id, query, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("introductions")
      .select("id, created_at, target_contact_id, contacts(full_name)")
      .in("workspace_id", workspaceIds)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("sync_jobs")
      .select("id, source, status, completed_at, created_at, total")
      .eq("user_id", user.id)
      .in("workspace_id", workspaceIds)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(limit),
    supabase
      .from("workspace_members")
      .select("id, joined_at, profiles(name)")
      .in("workspace_id", workspaceIds)
      .order("joined_at", { ascending: false })
      .limit(limit),
    supabase
      .from("data_connectors")
      .select("id, connector_key, last_synced_at, account_label")
      .eq("user_id", user.id)
      .in("workspace_id", workspaceIds)
      .not("last_synced_at", "is", null)
      .order("last_synced_at", { ascending: false })
      .limit(limit),
  ]);

  const items: ActivityItem[] = [];

  for (const search of searches ?? []) {
    items.push({
      id: `search-${search.id}`,
      event: `AI search: ${search.query}`,
      time: formatRelativeTime(search.created_at),
      created_at: search.created_at,
    });
  }

  for (const intro of intros ?? []) {
    const contact = intro.contacts as { full_name: string } | { full_name: string }[] | null;
    const name = Array.isArray(contact) ? contact[0]?.full_name : contact?.full_name;
    items.push({
      id: `intro-${intro.id}`,
      event: `Introduction requested${name ? ` to ${name}` : ""}`,
      time: formatRelativeTime(intro.created_at),
      created_at: intro.created_at,
    });
  }

  for (const job of syncJobs ?? []) {
    const count = job.total ? ` (${job.total} contacts)` : "";
    items.push({
      id: `sync-${job.id}`,
      event: `Synced contacts from ${String(job.source).replace(/_/g, " ")}${count}`,
      time: formatRelativeTime(job.completed_at ?? job.created_at),
      created_at: job.completed_at ?? job.created_at,
    });
  }

  for (const connector of connectors ?? []) {
    items.push({
      id: `connector-${connector.id}`,
      event: `Synced ${connector.connector_key.replace(/_/g, " ")}${connector.account_label ? ` (${connector.account_label})` : ""}`,
      time: formatRelativeTime(connector.last_synced_at!),
      created_at: connector.last_synced_at!,
    });
  }

  for (const member of members ?? []) {
    const profile = member.profiles as { name: string } | { name: string }[] | null;
    const name = Array.isArray(profile) ? profile[0]?.name : profile?.name;
    if (!name) continue;
    items.push({
      id: `member-${member.id}`,
      event: `${name} joined a group`,
      time: formatRelativeTime(member.joined_at),
      created_at: member.joined_at,
    });
  }

  return items
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}
