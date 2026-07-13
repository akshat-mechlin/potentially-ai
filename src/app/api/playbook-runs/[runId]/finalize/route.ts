import { NextResponse } from "next/server";
import { z } from "zod";
import { finalizeRunProspects } from "@/lib/data/playbooks";

const schema = z.object({
  prospect_ids: z.array(z.string()),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const { prospect_ids } = schema.parse(await request.json());
    await finalizeRunProspects(runId, prospect_ids);
    return NextResponse.json({ ok: true, selected: prospect_ids.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to finalize run:", error);
    return NextResponse.json({ error: "Failed to finalize run" }, { status: 500 });
  }
}
