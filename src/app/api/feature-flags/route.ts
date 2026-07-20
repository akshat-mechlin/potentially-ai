import { NextResponse } from "next/server";
import { getAllFeatureFlags } from "@/lib/data/feature-flags";

export async function GET() {
  const flags = await getAllFeatureFlags();
  return NextResponse.json(flags);
}
