import { NextResponse } from "next/server";
import { z } from "zod";
import { importContacts, listContacts } from "@/lib/data/contacts";

const importSchema = z.object({
  contacts: z.array(
    z.object({
      full_name: z.string(),
      email: z.string().email().optional(),
      title: z.string().optional(),
      company_name: z.string().optional(),
    }),
  ),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contacts } = importSchema.parse(body);

    const result = await importContacts(contacts);

    return NextResponse.json({
      ...result,
      message: `Successfully imported ${result.imported} contacts`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid CSV data" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Import failed:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const contacts = await listContacts();
    return NextResponse.json({
      contacts,
      total: contacts.length,
    });
  } catch (error) {
    console.error("Failed to list contacts:", error);
    return NextResponse.json({ error: "Failed to load contacts" }, { status: 500 });
  }
}
