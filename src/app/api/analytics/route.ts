import { NextResponse } from "next/server";
import type { AnalyticsData } from "@/types";

export async function GET() {
  const data: AnalyticsData = {
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

  return NextResponse.json(data);
}
