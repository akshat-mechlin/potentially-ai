import { NextResponse } from "next/server";
import { runDueScheduledWorkflowsForSession } from "@/lib/workflows/triggers";

/** Runs any due scheduled workflows for the signed-in workspace. */
export async function POST() {
  try {
    const result = await runDueScheduledWorkflowsForSession();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Due schedule run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
