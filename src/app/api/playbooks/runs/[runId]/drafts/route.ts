import { NextResponse } from "next/server";
import { generateProspectDrafts, getPlaybookRun, getPlaybook } from "@/lib/data/playbooks";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const run = await getPlaybookRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    const playbook = await getPlaybook(run.playbook_id);
    if (!playbook) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    }
    await generateProspectDrafts(runId, playbook);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to generate drafts:", error);
    return NextResponse.json({ error: "Failed to generate drafts" }, { status: 500 });
  }
}
