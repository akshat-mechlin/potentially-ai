import { NextResponse } from "next/server";
import { z } from "zod";
import { generateOutreach } from "@/lib/ai/openai";
import { DEMO_CONTACTS } from "@/lib/demo-data";

const outreachSchema = z.object({
  contact_id: z.string(),
  type: z.enum(["cold_email", "warm_intro", "linkedin"]),
  tone: z.enum(["professional", "casual", "friendly"]),
  goal: z.string().min(1).max(500),
  context: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const params = outreachSchema.parse(body);

    const contact = DEMO_CONTACTS.find((c) => c.id === params.contact_id);
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
    return NextResponse.json({ error: "Outreach generation failed" }, { status: 500 });
  }
}
