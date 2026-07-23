import { NextResponse } from "next/server";
import { getPlaybook, listPendingApprovalsForPlaybook } from "@/lib/data/playbooks";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const playbook = await getPlaybook(id);
    if (!playbook) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    }
    const approvals = await listPendingApprovalsForPlaybook(id);
    return NextResponse.json({ approvals, count: approvals.length });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to load pending approvals:", error);
    return NextResponse.json({ error: "Failed to load pending approvals" }, { status: 500 });
  }
}
