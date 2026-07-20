import { NextResponse } from "next/server";
import { z } from "zod";
import { generateOutreach } from "@/lib/ai/openai";
import { getContact } from "@/lib/data/contacts";
import { featureDisabledResponse } from "@/lib/data/feature-flags";

const outreachSchema = z.object({
  contact_id: z.string(),
  type: z.enum(["cold_email", "warm_intro", "linkedin"]),
  tone: z.enum(["professional", "casual", "friendly"]),
  goal: z.string().min(1).max(500),
  context: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const disabled = await featureDisabledResponse("outreach_engine", "Outreach engine");
    if (disabled) return disabled;

    const body = await request.json();
    const params = outreachSchema.parse(body);

    const contact = await getContact(params.contact_id);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const result = await generateOutreach({
      contactName: contact.full_name,
      contactTitle: contact.title,
      companyName: contact.company_name,
      type: params.type,
      tone: params.tone,
      goal: params.goal,
      context: params.context,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Outreach generation failed:", error);
    return NextResponse.json({ error: "Outreach generation failed" }, { status: 500 });
  }
}
