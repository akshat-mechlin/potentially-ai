import { NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/data/analytics";
import { isFeatureEnabled } from "@/lib/data/feature-flags";

export async function GET() {
  try {
    const enabled = await isFeatureEnabled("analytics");
    if (!enabled) {
      return NextResponse.json({ error: "Analytics is disabled" }, { status: 403 });
    }

    const data = await getAnalyticsData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Analytics failed:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
