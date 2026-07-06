import { NextResponse } from "next/server";
import { z } from "zod";
import { deployPlaybookRun } from "@/lib/data/playbooks";

const schema = z.object({
  segment_id: z.string().optional(),
  dry_run: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const run = await deployPlaybookRun(id, {
      segmentId: body.segment_id,
      dryRun: body.dry_run,
    });
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid run options" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to start playbook run:", error);
    return NextResponse.json({ error: "Failed to start run" }, { status: 500 });
  }
}
