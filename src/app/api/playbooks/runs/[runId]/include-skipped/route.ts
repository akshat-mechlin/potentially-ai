import { NextResponse } from "next/server";
import { z } from "zod";
import { includeSkippedProspects } from "@/lib/data/playbooks";

const schema = z.object({
  prospect_ids: z.array(z.string()).min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const { prospect_ids } = schema.parse(await request.json());
    const result = await includeSkippedProspects(runId, prospect_ids);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message === "No skipped prospects selected") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("Failed to include skipped prospects:", error);
    return NextResponse.json({ error: "Failed to include skipped prospects" }, { status: 500 });
  }
}
