import { NextResponse } from "next/server";
import { z } from "zod";
import {
  countContacts,
  importContacts,
  listContacts,
  setContactsExcluded,
  type ContactExcludedStatus,
} from "@/lib/data/contacts";
import { markCustomDataImported } from "@/lib/data/connectors";

const optionalString = z.string().max(2000).optional().or(z.literal(""));

const importSchema = z.object({
  contacts: z
    .array(
      z.object({
        full_name: z.string().min(1).max(500),
        first_name: optionalString,
        last_name: optionalString,
        email: z.string().email().optional().or(z.literal("")),
        title: optionalString,
        company_name: optionalString,
        phone: optionalString,
        linkedin_url: optionalString,
        twitter_url: optionalString,
        location: optionalString,
        extras: z.record(z.string(), z.string()).optional(),
      }),
    )
    .min(1)
    .max(2000),
  file_name: z.string().max(255).optional(),
  sheet_name: z.string().max(255).optional(),
  import_batch_id: z.string().max(120).optional(),
  finalize: z.boolean().optional(),
  records_count: z.number().int().min(0).optional(),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(5000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  q: z.string().max(200).optional(),
  source: z.string().max(64).optional(),
  import_batch_id: z.string().max(120).optional(),
  excluded: z.enum(["active", "excluded", "all"]).optional(),
  has_email: z.enum(["true", "false"]).optional(),
  has_company: z.enum(["true", "false"]).optional(),
  has_title: z.enum(["true", "false"]).optional(),
});

const excludeSchema = z.object({
  ids: z.array(z.string().min(1).max(120)).min(1).max(500),
  excluded: z.boolean(),
});

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseBoolParam(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = importSchema.parse(body);
    const contacts = parsed.contacts.map((c) => ({
      full_name: c.full_name,
      first_name: clean(c.first_name),
      last_name: clean(c.last_name),
      email: clean(c.email),
      title: clean(c.title),
      company_name: clean(c.company_name),
      phone: clean(c.phone),
      linkedin_url: clean(c.linkedin_url),
      twitter_url: clean(c.twitter_url),
      location: clean(c.location),
      extras: c.extras,
    }));

    const importBatchId =
      parsed.import_batch_id ??
      `csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await importContacts(contacts, {
      importBatchId,
      fileName: parsed.file_name,
      sheetName: parsed.sheet_name,
    });

    if (parsed.finalize !== false) {
      await markCustomDataImported(
        parsed.records_count ?? result.imported + result.updated,
        parsed.file_name,
        {
          importBatchId,
          sheetName: parsed.sheet_name,
        },
      );
    }

    return NextResponse.json({
      ...result,
      import_batch_id: importBatchId,
      message: `Imported ${result.imported} new and updated ${result.updated} contacts`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid CSV data" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Import failed:", error);
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = excludeSchema.parse(body);
    const result = await setContactsExcluded(parsed.ids, parsed.excluded);
    return NextResponse.json({
      ...result,
      message: parsed.excluded
        ? `Excluded ${result.updated} contact${result.updated === 1 ? "" : "s"} from your network`
        : `Restored ${result.updated} contact${result.updated === 1 ? "" : "s"} to your network`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to update contacts:", error);
    return NextResponse.json({ error: "Failed to update contacts" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      source: searchParams.get("source") ?? undefined,
      import_batch_id: searchParams.get("import_batch_id") ?? undefined,
      excluded: searchParams.get("excluded") ?? undefined,
      has_email: searchParams.get("has_email") ?? undefined,
      has_company: searchParams.get("has_company") ?? undefined,
      has_title: searchParams.get("has_title") ?? undefined,
    });

    const excludedStatus = (parsed.excluded ?? "active") as ContactExcludedStatus;
    const listOptions = {
      limit: parsed.limit,
      offset: parsed.offset,
      q: parsed.q,
      source: parsed.source,
      importBatchId: parsed.import_batch_id,
      excludedStatus,
      hasEmail: parseBoolParam(parsed.has_email),
      hasCompany: parseBoolParam(parsed.has_company),
      hasTitle: parseBoolParam(parsed.has_title),
    };
    const contacts = await listContacts(listOptions);
    const total = await countContacts(listOptions);

    return NextResponse.json({
      contacts,
      total,
    });
  } catch (error) {
    console.error("Failed to list contacts:", error);
    return NextResponse.json({ error: "Failed to load contacts" }, { status: 500 });
  }
}
