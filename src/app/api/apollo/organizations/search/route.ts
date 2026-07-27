import { NextResponse } from "next/server";
import { z } from "zod";
import { withApolloAccount } from "@/lib/integrations/apollo/client";
import { searchApolloOrganizations } from "@/lib/integrations/apollo/organizations-search";
import type { ApolloOrganizationSearchFilters } from "@/lib/integrations/apollo/types";
import { apolloErrorResponse, ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";

const schema = z.object({
  account_id: z.string().uuid().optional(),
  filters: z
    .object({
      q_organization_keyword_tags: z.array(z.string()).optional(),
      organization_locations: z.array(z.string()).optional(),
      organization_num_employees_ranges: z.array(z.string()).optional(),
      q_organization_domains_list: z.array(z.string()).optional(),
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
    const filters = (body.filters ?? {}) as ApolloOrganizationSearchFilters;

    const result = await withApolloAccount(body.account_id, async ({ accessToken }) =>
      searchApolloOrganizations(accessToken, filters),
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apolloErrorResponse(error);
  }
}
