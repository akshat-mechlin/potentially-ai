import { NextResponse } from "next/server";
import { z } from "zod";
import { findOrCreateApolloRecordFromContact, getApolloRecord } from "@/lib/data/apollo-records";
import { getContact } from "@/lib/data/contacts";
import { apolloErrorResponse, ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";

export async function GET(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Record id required" }, { status: 400 });
    }

    const record = await getApolloRecord(id);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    return apolloErrorResponse(error);
  }
}

const stubSchema = z.object({
  contact_id: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const body = stubSchema.parse(await request.json());
    const contact = await getContact(body.contact_id);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const record = await findOrCreateApolloRecordFromContact({
      id: contact.id,
      full_name: contact.full_name,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      title: contact.title,
      company_name: contact.company_name,
      phone: contact.phone,
      location: contact.location,
      linkedin_url: contact.linkedin_url,
    });

    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apolloErrorResponse(error);
  }
}
