import { NextResponse } from "next/server";
import { z } from "zod";
import { withApolloAccount } from "@/lib/integrations/apollo/client";
import { enrichApolloOrganization } from "@/lib/integrations/apollo/organizations-enrichment";
import { apolloErrorResponse, ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";

const schema = z.object({
  account_id: z.string().uuid().optional(),
  domain: z.string().optional(),
  name: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const body = schema.parse(await request.json());
    if (!body.domain && !body.name) {
      return NextResponse.json({ error: "Provide a domain or company name." }, { status: 400 });
    }

    const result = await withApolloAccount(body.account_id, async ({ accessToken }) =>
      enrichApolloOrganization(accessToken, {
        domain: body.domain,
        name: body.name,
      }),
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apolloErrorResponse(error);
  }
}
