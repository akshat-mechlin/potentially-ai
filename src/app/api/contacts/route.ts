import { NextResponse } from "next/server";
import { z } from "zod";
import { countContacts, importContacts, listContacts } from "@/lib/data/contacts";
import { markCustomDataImported } from "@/lib/data/connectors";

const importSchema = z.object({
  contacts: z.array(
    z.object({
      full_name: z.string(),
      email: z.string().email().optional(),
      title: z.string().optional(),
      company_name: z.string().optional(),
    }),
  ),
  file_name: z.string().optional(),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(5000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  q: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contacts, file_name } = importSchema.parse(body);

    const result = await importContacts(contacts);
    await markCustomDataImported(result.imported, file_name);

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { limit, offset, q } = listQuerySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    const contacts = await listContacts({ limit, offset, q });
    const total = limit != null || q ? await countContacts({ q }) : contacts.length;

    return NextResponse.json({
      contacts,
      total,
    });
  } catch (error) {
    console.error("Failed to list contacts:", error);
    return NextResponse.json({ error: "Failed to load contacts" }, { status: 500 });
  }
}
