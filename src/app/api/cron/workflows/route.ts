import { NextResponse } from "next/server";
import { processDueScheduledWorkflows } from "@/lib/workflows/triggers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueScheduledWorkflows();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Workflow schedule cron failed:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
