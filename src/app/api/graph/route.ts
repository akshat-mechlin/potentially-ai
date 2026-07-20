import { NextResponse } from "next/server";
import { getGraphData } from "@/lib/data/graph";
import { featureDisabledResponse } from "@/lib/data/feature-flags";

export async function GET() {
  try {
    const disabled = await featureDisabledResponse("graph_view", "Network graph");
    if (disabled) return disabled;

    const data = await getGraphData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Graph failed:", error);
    return NextResponse.json({ error: "Failed to load graph" }, { status: 500 });
  }
}
