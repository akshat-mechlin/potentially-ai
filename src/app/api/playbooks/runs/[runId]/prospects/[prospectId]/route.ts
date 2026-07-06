import { NextResponse } from "next/server";
import { z } from "zod";
import { updateProspectDraft } from "@/lib/data/playbooks";

const schema = z.object({
  draft_subject: z.string().optional(),
  draft_body: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ runId: string; prospectId: string }> },
) {
  try {
    const { prospectId } = await params;
    const updates = schema.parse(await request.json());
    await updateProspectDraft(prospectId, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid draft" }, { status: 400 });
    }
    console.error("Failed to update draft:", error);
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
  }
}
