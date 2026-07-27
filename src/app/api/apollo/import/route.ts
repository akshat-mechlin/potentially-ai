import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertApolloRecordsFromApolloPayload } from "@/lib/data/apollo-records";
import { logAuditEvent } from "@/lib/data/audit";
import { apolloErrorResponse, ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";
import type { ApolloOrganization, ApolloPerson } from "@/lib/integrations/apollo/types";

const schema = z.object({
  people: z.array(z.record(z.string(), z.unknown())).optional(),
  organizations: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function POST(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const body = schema.parse(await request.json());
    const people = (body.people ?? []) as ApolloPerson[];
    const organizations = (body.organizations ?? []) as ApolloOrganization[];

    if (!people.length && !organizations.length) {
      return NextResponse.json({ error: "No importable Apollo records provided." }, { status: 400 });
    }

    const result = await upsertApolloRecordsFromApolloPayload({
      people,
      organizations,
      savedFrom: "import",
    });

    await logAuditEvent("apollo.import", "apollo_record", "batch", {
      saved: result.saved,
      count: people.length + organizations.length,
    });

    return NextResponse.json({
      saved: result.saved,
      records: result.records,
      imported: result.saved,
      updated: 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apolloErrorResponse(error);
  }
}
