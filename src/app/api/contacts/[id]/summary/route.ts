import { NextResponse } from "next/server";
import { generateContactSummary } from "@/lib/ai/openai";
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

    const summary = await generateContactSummary({
      full_name: contact.full_name,
      title: contact.title,
      company_name: contact.company_name,
      bio: contact.bio,
      tags: contact.tags,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summary failed:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
