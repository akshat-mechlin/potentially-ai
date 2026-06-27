import { NextResponse } from "next/server";
import { getGraphData } from "@/lib/data/graph";

export async function GET() {
  try {
    const data = await getGraphData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Graph failed:", error);
    return NextResponse.json({ error: "Failed to load graph" }, { status: 500 });
  }
}
