import { NextResponse } from "next/server";
import { generateContactSummary } from "@/lib/ai/openai";
import {
  buildContactDetailPoints,
  buildContactSummaryContext,
} from "@/lib/contacts/profile-details";
import { getContact } from "@/lib/data/contacts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const contact = await getContact(id);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const context = buildContactSummaryContext(contact);
    const details = buildContactDetailPoints(contact);
    const summary = await generateContactSummary(context);

    return NextResponse.json({ summary, details });
  } catch (error) {
    console.error("Summary failed:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
