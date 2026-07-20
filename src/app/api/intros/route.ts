import { NextResponse } from "next/server";
import { z } from "zod";
import { createIntroduction, listIntroductions } from "@/lib/data/intros";
import { featureDisabledResponse } from "@/lib/data/feature-flags";

const introSchema = z.object({
  target_contact_id: z.string().min(1),
  message: z.string().optional(),
});

export async function GET() {
  try {
    const disabled = await featureDisabledResponse("outreach_engine", "Outreach engine");
    if (disabled) return disabled;

    const introductions = await listIntroductions();
    return NextResponse.json({ introductions });
  } catch (error) {
    console.error("Failed to load introductions:", error);
    return NextResponse.json({ error: "Failed to load introductions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const disabled = await featureDisabledResponse("outreach_engine", "Outreach engine");
    if (disabled) return disabled;

    const body = await request.json();
    const { target_contact_id, message } = introSchema.parse(body);
    const intro = await createIntroduction(target_contact_id, message);
    return NextResponse.json(intro);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Contact not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Failed to create introduction:", error);
    return NextResponse.json({ error: "Failed to create introduction" }, { status: 500 });
  }
}
