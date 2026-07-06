import { NextResponse } from "next/server";
import { getPlaybookRun, listRunProspects } from "@/lib/data/playbooks";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const run = await getPlaybookRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    const prospects = await listRunProspects(runId);
    return NextResponse.json({ run, prospects });
  } catch (error) {
    console.error("Failed to load run:", error);
    return NextResponse.json({ error: "Failed to load run" }, { status: 500 });
  }
}
