import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_CONTACTS } from "@/lib/demo-data";

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

    return NextResponse.json({
      imported: contacts.length,
      duplicates: 0,
      message: `Successfully imported ${contacts.length} contacts`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid CSV data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    contacts: DEMO_CONTACTS,
    total: DEMO_CONTACTS.length,
  });
}
