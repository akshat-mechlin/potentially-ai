import { NextResponse } from "next/server";
import { z } from "zod";
import { enrichApolloRecords } from "@/lib/data/apollo-records";
import { apolloErrorResponse, ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  acknowledge_unverified: z.boolean().optional(),
  account_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const body = schema.parse(await request.json());
    const results = await enrichApolloRecords({
      ids: body.ids,
      acknowledgeUnverified: body.acknowledge_unverified,
      accountId: body.account_id,
    });

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apolloErrorResponse(error);
  }
}
