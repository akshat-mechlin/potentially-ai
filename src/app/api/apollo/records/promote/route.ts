import { NextResponse } from "next/server";
import { z } from "zod";
import { promoteApolloRecordsToContacts } from "@/lib/data/apollo-records";
import { apolloErrorResponse, ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const body = schema.parse(await request.json());
    const result = await promoteApolloRecordsToContacts(body.ids);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apolloErrorResponse(error);
  }
}
