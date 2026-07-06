import { NextResponse } from "next/server";
import { z } from "zod";
import { bulkApproveAndSend } from "@/lib/data/playbooks";

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
    const results = await bulkApproveAndSend(runId, prospect_ids);
    return NextResponse.json({ results, sent: results.filter((r) => r.ok).length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Bulk send failed:", error);
    return NextResponse.json({ error: "Bulk send failed" }, { status: 500 });
  }
}
