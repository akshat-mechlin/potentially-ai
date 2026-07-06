import { NextResponse } from "next/server";
import { z } from "zod";
import { listSequenceSteps, saveSequenceSteps } from "@/lib/data/playbook-sequences";

const schema = z.object({
  steps: z.array(
    z.object({
      delay_days: z.number().min(0),
      tone: z.string().optional(),
      goal_override: z.string().optional(),
      subject_hint: z.string().optional(),
    }),
  ),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const steps = await listSequenceSteps(id);
    return NextResponse.json({ steps });
  } catch (error) {
    console.error("Failed to load sequence:", error);
    return NextResponse.json({ error: "Failed to load sequence" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { steps } = schema.parse(await request.json());
    await saveSequenceSteps(id, steps);
    return NextResponse.json({ ok: true, steps: await listSequenceSteps(id) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid sequence" }, { status: 400 });
    }
    console.error("Failed to save sequence:", error);
    return NextResponse.json({ error: "Failed to save sequence" }, { status: 500 });
  }
}
