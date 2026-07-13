import { NextResponse } from "next/server";
import { z } from "zod";
import { approveAndSendProspect } from "@/lib/data/playbooks";

const schema = z.object({
  prospect_id: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const { prospect_id } = schema.parse(await request.json());
    const result = await approveAndSendProspect(prospect_id, runId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to send prospect email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 },
    );
  }
}
