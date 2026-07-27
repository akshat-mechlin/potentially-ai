import { NextResponse } from "next/server";
import { z } from "zod";
import { withApolloAccount } from "@/lib/integrations/apollo/client";
import { searchApolloPeople } from "@/lib/integrations/apollo/people-search";
import type { ApolloPeopleSearchFilters } from "@/lib/integrations/apollo/types";
import { apolloErrorResponse, ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";

const schema = z.object({
  account_id: z.string().uuid().optional(),
  filters: z
    .object({
      person_titles: z.array(z.string()).optional(),
      person_seniorities: z.array(z.string()).optional(),
      person_locations: z.array(z.string()).optional(),
      organization_locations: z.array(z.string()).optional(),
      q_organization_keyword_tags: z.array(z.string()).optional(),
      q_keywords: z.array(z.string()).optional(),
      page: z.number().int().min(1).optional(),
      per_page: z.number().int().min(1).max(100).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const body = schema.parse(await request.json());
    const filters = (body.filters ?? {}) as ApolloPeopleSearchFilters;

    const result = await withApolloAccount(body.account_id, async ({ accessToken }) =>
      searchApolloPeople(accessToken, filters),
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apolloErrorResponse(error);
  }
}
