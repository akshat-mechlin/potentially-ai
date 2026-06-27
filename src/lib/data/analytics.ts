import { isDataDemoMode } from "@/lib/app-config";
import type { AnalyticsData } from "@/types";
import { getUserWorkspaceContext } from "./workspace";
import { format, subDays, startOfMonth, subMonths } from "date-fns";

function demoAnalytics(): AnalyticsData {
  return {
    searches_per_day: [
      { date: "Mon", count: 12 },
      { date: "Tue", count: 19 },
      { date: "Wed", count: 8 },
      { date: "Thu", count: 24 },
      { date: "Fri", count: 15 },
      { date: "Sat", count: 3 },
      { date: "Sun", count: 5 },
    ],
    top_contacts: [
      { name: "Emily Rodriguez", interactions: 34 },
      { name: "Sarah Chen", interactions: 28 },
      { name: "Lisa Wang", interactions: 22 },
      { name: "James Park", interactions: 18 },
      { name: "Tom Bradley", interactions: 15 },
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
      { type: "Meetings", count: 42 },
      { type: "Intros", count: 18 },
      { type: "LinkedIn", count: 89 },
    ],
  };
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  if (isDataDemoMode()) return demoAnalytics();

  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) return demoAnalytics();

  const weekAgo = subDays(new Date(), 7).toISOString();

  const [
    { data: searches },
    { data: contacts },
    { data: events },
    { count: totalContacts },
  ] = await Promise.all([
    supabase
      .from("search_history")
      .select("created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", weekAgo),
    supabase
      .from("contacts")
      .select("full_name, strength_score")
      .eq("workspace_id", workspaceId)
      .order("strength_score", { ascending: false })
      .limit(5),
    supabase
      .from("relationship_events")
      .select("type")
      .eq("workspace_id", workspaceId),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
  ]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const countsByDay = new Map<string, number>();
  dayLabels.forEach((d) => countsByDay.set(d, 0));
  (searches ?? []).forEach((s) => {
    const label = dayLabels[new Date(s.created_at).getDay()];
    countsByDay.set(label, (countsByDay.get(label) ?? 0) + 1);
  });

  const engagementMap = new Map<string, number>();
  (events ?? []).forEach((e) => {
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
  });

  const growth: AnalyticsData["workspace_growth"] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const { count } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .lte("created_at", monthStart.toISOString());

    growth.push({
      date: format(monthStart, "MMM"),
      contacts: count ?? 0,
    });
  }
  if (totalContacts !== null) {
    growth[growth.length - 1] = {
      date: format(new Date(), "MMM"),
      contacts: totalContacts,
    };
  }

  return {
    searches_per_day: dayLabels.slice(1).concat(dayLabels[0]).map((date) => ({
      date,
      count: countsByDay.get(date) ?? 0,
    })),
    top_contacts: (contacts ?? []).map((c) => ({
      name: c.full_name,
      interactions: Math.round(c.strength_score ?? 0),
    })),
    workspace_growth: growth,
    engagement: Array.from(engagementMap.entries()).map(([type, count]) => ({ type, count })),
  };
}
