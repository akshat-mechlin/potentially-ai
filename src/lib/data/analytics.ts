import { format, subDays, eachDayOfInterval } from "date-fns";
import { isDataDemoMode } from "@/lib/app-config";
import type { AnalyticsData, AnalyticsInsight } from "@/types";
import { getUserWorkspaceContext, listUserWorkspaces } from "./workspace";

const STRENGTH_BUCKETS = [
  { key: "cold" as const, label: "Cold", min: 0, max: 24 },
  { key: "warm" as const, label: "Warm", min: 25, max: 49 },
  { key: "strong" as const, label: "Strong", min: 50, max: 74 },
  { key: "champion" as const, label: "Champion", min: 75, max: 100 },
];

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function buildInsights(input: {
  contacts: number;
  stale: number;
  coldShare: number;
  replyRate: number | null;
  searchesDelta: number | null;
  growthDelta: number | null;
  pendingIntros: number;
}): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];

  if (input.stale > 0 && input.contacts > 0) {
    const share = Math.round((input.stale / input.contacts) * 100);
    if (share >= 15) {
      insights.push({
        id: "stale",
        tone: "warning",
        title: `${input.stale.toLocaleString()} contacts went quiet`,
        description: `${share}% of your network has no interaction in 90+ days. Re-engage or prune.`,
        href: "/contacts",
        cta: "Review contacts",
      });
    }
  }

  if (input.coldShare >= 50) {
    insights.push({
      id: "cold-network",
      tone: "warning",
      title: "Most relationships are still cold",
      description: `${input.coldShare}% of contacts score under 25. Sync connectors and log real touchpoints.`,
      href: "/connectors",
      cta: "Open connectors",
    });
  }

  if (input.replyRate !== null && input.replyRate < 12) {
    insights.push({
      id: "reply-rate",
      tone: "warning",
      title: `Reply rate is ${input.replyRate}%`,
      description: "Warm paths and tighter ICP usually lift replies faster than more volume.",
      href: "/playbooks",
      cta: "Review playbooks",
    });
  } else if (input.replyRate !== null && input.replyRate >= 20) {
    insights.push({
      id: "reply-strong",
      tone: "positive",
      title: `Reply rate is ${input.replyRate}%`,
      description: "Outreach is converting. Scale the playbooks that are winning.",
      href: "/playbooks",
      cta: "Open playbooks",
    });
  }

  if (input.searchesDelta !== null && input.searchesDelta <= -20) {
    insights.push({
      id: "searches-down",
      tone: "neutral",
      title: "Search activity slowed",
      description: `Searches are down ${Math.abs(input.searchesDelta)}% vs last week. Pick up where you left off.`,
      href: "/search",
      cta: "Search network",
    });
  }

  if (input.growthDelta !== null && input.growthDelta >= 10) {
    insights.push({
      id: "growth-up",
      tone: "positive",
      title: `Network grew ${input.growthDelta}%`,
      description: "Contact coverage is expanding. Keep enriching and tagging new people.",
      href: "/network",
      cta: "View network",
    });
  }

  if (input.pendingIntros > 0) {
    insights.push({
      id: "pending-intros",
      tone: "neutral",
      title: `${input.pendingIntros} intro${input.pendingIntros === 1 ? "" : "s"} waiting`,
      description: "Follow up on open introductions before momentum fades.",
      href: "/intros",
      cta: "Open intros",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "healthy",
      tone: "positive",
      title: "Pipeline looks healthy",
      description: "Keep searching, logging interactions, and running focused outreach.",
      href: "/search",
      cta: "Find people",
    });
  }

  return insights.slice(0, 4);
}

function demoAnalytics(): AnalyticsData {
  const searchesThisWeek = 86;
  const searchesLastWeek = 71;
  const contacts = 847;
  const contactsPrev = 780;
  const sent = 124;
  const replied = 28;
  const booked = 9;
  const stale = 118;
  const cold = 312;
  const avgStrength = 41;
  const pendingIntros = 4;

  const strength_distribution: AnalyticsData["strength_distribution"] = [
    { key: "cold", label: "Cold", count: cold, color: "var(--chart-5)" },
    { key: "warm", label: "Warm", count: 268, color: "var(--chart-4)" },
    { key: "strong", label: "Strong", count: 179, color: "var(--chart-2)" },
    { key: "champion", label: "Champion", count: 88, color: "var(--chart-1)" },
  ];

  const dayLabels = eachDayOfInterval({
    start: subDays(new Date(), 13),
    end: new Date(),
  }).map((d, i) => ({
    date: format(d, "MMM d"),
    count: [4, 7, 5, 11, 9, 3, 2, 8, 12, 6, 14, 10, 5, 7][i] ?? 5,
  }));

  return {
    summary: {
      contacts,
      contacts_delta: pctChange(contacts, contactsPrev),
      searches_7d: searchesThisWeek,
      searches_delta: pctChange(searchesThisWeek, searchesLastWeek),
      avg_strength: avgStrength,
      stale_contacts: stale,
      pending_intros: pendingIntros,
      outreach_sent: sent,
      reply_rate: Math.round((replied / sent) * 100),
      booked,
    },
    searches_per_day: dayLabels,
    top_contacts: [
      { id: "ct-001", name: "Sarah Chen", interactions: 34, strength: 92, company: "Stripe" },
      { id: "ct-002", name: "James Park", interactions: 28, strength: 86, company: "Notion" },
      { id: "ct-003", name: "Emily Rodriguez", interactions: 22, strength: 78, company: "Figma" },
      { id: "ct-004", name: "Lisa Wang", interactions: 18, strength: 71, company: "Linear" },
      { id: "ct-005", name: "Tom Bradley", interactions: 15, strength: 64, company: "Ramp" },
    ],
    workspace_growth: [
      { date: "Jan", contacts: 120 },
      { date: "Feb", contacts: 245 },
      { date: "Mar", contacts: 380 },
      { date: "Apr", contacts: 520 },
      { date: "May", contacts: 680 },
      { date: "Jun", contacts: 847 },
    ],
    engagement: [
      { type: "Emails", count: 156 },
      { type: "LinkedIn", count: 89 },
      { type: "Meetings", count: 42 },
      { type: "Intros", count: 18 },
    ],
    strength_distribution,
    outreach_funnel: [
      { stage: "Matched", count: 420 },
      { stage: "Sent", count: sent },
      { stage: "Replied", count: replied },
      { stage: "Booked", count: booked },
    ],
    intro_pipeline: [
      { status: "Draft", count: 2 },
      { status: "Requested", count: 4 },
      { status: "Accepted", count: 3 },
      { status: "Completed", count: 11 },
      { status: "Declined", count: 1 },
    ],
    insights: buildInsights({
      contacts,
      stale,
      coldShare: Math.round((cold / contacts) * 100),
      replyRate: Math.round((replied / sent) * 100),
      searchesDelta: pctChange(searchesThisWeek, searchesLastWeek),
      growthDelta: pctChange(contacts, contactsPrev),
      pendingIntros,
    }),
  };
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  if (isDataDemoMode()) return demoAnalytics();

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return demoAnalytics();

  const workspaceIds = (await listUserWorkspaces(supabase)).map((workspace) => workspace.id);
  if (!workspaceIds.length) return demoAnalytics();

  const now = new Date();
  const fourteenAgo = subDays(now, 13);
  const sevenAgo = subDays(now, 7);
  const fourteenDaysAgoIso = subDays(now, 14).toISOString();
  const ninetyAgoIso = subDays(now, 90).toISOString();

  const [
    { data: searches },
    { data: contacts },
    { data: events },
    { data: growthRows },
    { data: intros },
    { data: runs },
  ] = await Promise.all([
    supabase
      .from("search_history")
      .select("created_at")
      .eq("user_id", user.id)
      .in("workspace_id", workspaceIds)
      .gte("created_at", fourteenDaysAgoIso),
    supabase
      .from("contacts")
      .select("id, full_name, company_name, strength_score, last_interaction_at")
      .in("workspace_id", workspaceIds),
    supabase.from("relationship_events").select("type").in("workspace_id", workspaceIds),
    supabase.rpc("get_workspace_contact_growth", {
      p_workspace_ids: workspaceIds,
      p_months: 6,
    }),
    supabase.from("introductions").select("status").in("workspace_id", workspaceIds),
    supabase.from("playbook_runs").select("id").in("workspace_id", workspaceIds),
  ]);

  const runIds = (runs ?? []).map((r) => r.id);
  const { data: prospects } =
    runIds.length > 0
      ? await supabase.from("playbook_run_contacts").select("status").in("run_id", runIds)
      : { data: [] as Array<{ status: string }> };

  const contactRows = contacts ?? [];
  const totalContacts = contactRows.length;
  const avgStrength =
    totalContacts === 0
      ? 0
      : Math.round(
          contactRows.reduce((sum, c) => sum + (c.strength_score ?? 0), 0) / totalContacts,
        );

  const stale = contactRows.filter((c) => {
    if (!c.last_interaction_at) return true;
    return new Date(c.last_interaction_at).getTime() < new Date(ninetyAgoIso).getTime();
  }).length;

  const strengthCounts = { cold: 0, warm: 0, strong: 0, champion: 0 };
  for (const c of contactRows) {
    const score = Math.round(c.strength_score ?? 0);
    if (score >= 75) strengthCounts.champion += 1;
    else if (score >= 50) strengthCounts.strong += 1;
    else if (score >= 25) strengthCounts.warm += 1;
    else strengthCounts.cold += 1;
  }

  const strength_distribution = STRENGTH_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: strengthCounts[bucket.key],
    color:
      bucket.key === "cold"
        ? "var(--chart-5)"
        : bucket.key === "warm"
          ? "var(--chart-4)"
          : bucket.key === "strong"
            ? "var(--chart-2)"
            : "var(--chart-1)",
  }));

  const days = eachDayOfInterval({ start: fourteenAgo, end: now });
  const searchCounts = new Map(days.map((d) => [format(d, "yyyy-MM-dd"), 0]));
  let searchesThisWeek = 0;
  let searchesLastWeek = 0;
  for (const s of searches ?? []) {
    const created = new Date(s.created_at);
    const key = format(created, "yyyy-MM-dd");
    if (searchCounts.has(key)) {
      searchCounts.set(key, (searchCounts.get(key) ?? 0) + 1);
    }
    if (created >= sevenAgo) searchesThisWeek += 1;
    else if (created >= new Date(fourteenDaysAgoIso)) searchesLastWeek += 1;
  }

  const searches_per_day = days.map((d) => ({
    date: format(d, "MMM d"),
    count: searchCounts.get(format(d, "yyyy-MM-dd")) ?? 0,
  }));

  const engagementMap = new Map<string, number>();
  for (const e of events ?? []) {
    const label =
      e.type === "email"
        ? "Emails"
        : e.type === "meeting"
          ? "Meetings"
          : e.type === "introduction"
            ? "Intros"
            : e.type === "linkedin"
              ? "LinkedIn"
              : "Other";
    engagementMap.set(label, (engagementMap.get(label) ?? 0) + 1);
  }

  const introCounts = new Map<string, number>();
  for (const intro of intros ?? []) {
    const label =
      intro.status === "draft"
        ? "Draft"
        : intro.status === "requested"
          ? "Requested"
          : intro.status === "accepted"
            ? "Accepted"
            : intro.status === "completed"
              ? "Completed"
              : intro.status === "declined"
                ? "Declined"
                : "Other";
    introCounts.set(label, (introCounts.get(label) ?? 0) + 1);
  }
  const pendingIntros =
    (introCounts.get("Draft") ?? 0) +
    (introCounts.get("Requested") ?? 0) +
    (introCounts.get("Accepted") ?? 0);

  let matched = 0;
  let sent = 0;
  let replied = 0;
  let booked = 0;
  for (const row of prospects ?? []) {
    const status = row.status as string;
    if (["matched", "selected", "queued", "pending_approval"].includes(status)) matched += 1;
    if (["sent", "replied", "booked"].includes(status)) sent += 1;
    if (["replied", "booked"].includes(status)) replied += 1;
    if (status === "booked") booked += 1;
  }

  const growth = (growthRows ?? []).map((row: { month_label: string; contact_count: number }) => ({
    date: row.month_label,
    contacts: row.contact_count,
  }));
  const growthDelta =
    growth.length >= 2
      ? pctChange(growth[growth.length - 1].contacts, growth[growth.length - 2].contacts)
      : null;

  const top_contacts = [...contactRows]
    .sort((a, b) => (b.strength_score ?? 0) - (a.strength_score ?? 0))
    .slice(0, 5)
    .map((c) => ({
      id: c.id as string,
      name: c.full_name as string,
      interactions: Math.round(c.strength_score ?? 0),
      strength: Math.round(c.strength_score ?? 0),
      company: (c.company_name as string | null) ?? null,
    }));

  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : null;
  const coldShare =
    totalContacts > 0 ? Math.round((strengthCounts.cold / totalContacts) * 100) : 0;
  const searchesDelta = pctChange(searchesThisWeek, searchesLastWeek);

  return {
    summary: {
      contacts: totalContacts,
      contacts_delta: growthDelta,
      searches_7d: searchesThisWeek,
      searches_delta: searchesDelta,
      avg_strength: avgStrength,
      stale_contacts: stale,
      pending_intros: pendingIntros,
      outreach_sent: sent,
      reply_rate: replyRate,
      booked,
    },
    searches_per_day,
    top_contacts,
    workspace_growth: growth,
    engagement: Array.from(engagementMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    strength_distribution,
    outreach_funnel: [
      { stage: "Matched", count: matched + sent },
      { stage: "Sent", count: sent },
      { stage: "Replied", count: replied },
      { stage: "Booked", count: booked },
    ],
    intro_pipeline: ["Draft", "Requested", "Accepted", "Completed", "Declined"].map((status) => ({
      status,
      count: introCounts.get(status) ?? 0,
    })),
    insights: buildInsights({
      contacts: totalContacts,
      stale,
      coldShare,
      replyRate,
      searchesDelta,
      growthDelta,
      pendingIntros,
    }),
  };
}
