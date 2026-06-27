import { NextResponse } from "next/server";
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

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Failed to load contact:", error);
    return NextResponse.json({ error: "Failed to load contact" }, { status: 500 });
  }
}
