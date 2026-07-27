import { NextResponse } from "next/server";
import { z } from "zod";
import { getApolloRecord, listApolloRecords } from "@/lib/data/apollo-records";
import { apolloErrorResponse, ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";

export async function GET(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      const record = await getApolloRecord(id);
      if (!record) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }
      return NextResponse.json({ record });
    }

    const type = url.searchParams.get("type");
    const q = url.searchParams.get("q") ?? undefined;
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");
    const enrichmentStatus = url.searchParams.get("enrichment_status") ?? undefined;
    const inContacts = url.searchParams.get("in_contacts");

    const result = await listApolloRecords({
      type: type === "person" || type === "organization" ? type : undefined,
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      enrichmentStatus,
      inContacts:
        inContacts === "true" ? true : inContacts === "false" ? false : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apolloErrorResponse(error);
  }
}

const saveSchema = z.object({
  people: z.array(z.record(z.string(), z.unknown())).optional(),
  organizations: z.array(z.record(z.string(), z.unknown())).optional(),
  saved_from: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const body = saveSchema.parse(await request.json());
    const { upsertApolloRecordsFromApolloPayload } = await import("@/lib/data/apollo-records");
    const result = await upsertApolloRecordsFromApolloPayload({
      people: (body.people ?? []) as import("@/lib/integrations/apollo/types").ApolloPerson[],
      organizations: (body.organizations ?? []) as import("@/lib/integrations/apollo/types").ApolloOrganization[],
      savedFrom: body.saved_from ?? "search",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apolloErrorResponse(error);
  }
}
