import { NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/data/analytics";

export async function GET() {
  try {
    const data = await getAnalyticsData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Analytics failed:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
