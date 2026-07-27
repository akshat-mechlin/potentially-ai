import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlaybookRun, importApolloProspectsIntoRun } from "@/lib/data/playbooks";
import { withApolloAccount } from "@/lib/integrations/apollo/client";
import { icpToApolloFilterSummary, icpToApolloPeopleFilters } from "@/lib/integrations/apollo/icp-to-filters";
import { searchApolloPeople } from "@/lib/integrations/apollo/people-search";
import type { ApolloPerson } from "@/lib/integrations/apollo/types";
import { apolloErrorResponse, ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";
import type { IcpProfile } from "@/types/playbooks";

const searchSchema = z.object({
  action: z.literal("search"),
  account_id: z.string().uuid().optional(),
  page: z.number().int().min(1).optional(),
});

const importSchema = z.object({
  action: z.literal("import"),
  people: z.array(z.record(z.string(), z.unknown())).min(1),
});

const schema = z.discriminatedUnion("action", [searchSchema, importSchema]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const { runId } = await params;
    const run = await getPlaybookRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const body = schema.parse(await request.json());

    if (body.action === "search") {
      const filters = icpToApolloPeopleFilters(run.icp_snapshot as IcpProfile);
      if (body.page) filters.page = body.page;

      const result = await withApolloAccount(body.account_id, async ({ accessToken }) =>
        searchApolloPeople(accessToken, filters),
      );

      return NextResponse.json({
        ...result,
        filter_summary: icpToApolloFilterSummary(run.icp_snapshot as IcpProfile),
      });
    }

    const importResult = await importApolloProspectsIntoRun(
      runId,
      body.people as ApolloPerson[],
    );
    return NextResponse.json(importResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return apolloErrorResponse(error);
  }
}
