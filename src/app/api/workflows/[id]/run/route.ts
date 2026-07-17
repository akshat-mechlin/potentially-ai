import { NextResponse } from "next/server";
import { executeWorkflow } from "@/lib/workflows/execute";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { dry_run?: boolean };
    const result = await executeWorkflow(id, { dryRun: Boolean(body.dry_run) });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run workflow";
    console.error("Workflow run failed:", error);
    const status = message.includes("not found")
      ? 404
      : message.includes("Missing") || message.includes("Connect")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
