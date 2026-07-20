import { NextResponse } from "next/server";
import { syncWorkflowRunStatus } from "@/lib/workflows/run-status";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await syncWorkflowRunStatus(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Workflow run status failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load run status" },
      { status: 500 },
    );
  }
}
