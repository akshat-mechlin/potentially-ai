import { NextResponse } from "next/server";
import { z } from "zod";
import { parseApolloSearchIntent, parseSearchIntent, rankAndExplain } from "@/lib/ai/openai";
import { PlanLimitError, assertSearchAllowed } from "@/lib/billing/enforce";
import { saveSearchHistory, searchContactsForQuery } from "@/lib/data/contacts";
import { deduplicateSearchContacts } from "@/lib/data/search-deduplication";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/data/feature-flags";
import {
  getLinkedContactIdsForProspects,
  mapPlatformProspectsToSearchContacts,
  upsertPlatformProspectsFromApollo,
  searchPlatformProspects,
} from "@/lib/data/platform-prospects";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import { resolveApolloConnectorAccount, withApolloAccount } from "@/lib/integrations/apollo/client";
import {
  describeApolloSearchFilters,
  searchIntentToApolloFilters,
} from "@/lib/integrations/apollo/search-intent-to-filters";
import { searchApolloPeople } from "@/lib/integrations/apollo/people-search";
import { ApolloApiError } from "@/lib/integrations/apollo/client";
import { createClient } from "@/lib/supabase/server";
import { safeGetSessionUser } from "@/lib/supabase/auth";
import type { SearchResultContact, SearchSources } from "@/types";

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  workspace_id: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

type ApolloSearchOutcome = {
  success: boolean;
  contacts: SearchResultContact[];
  error?: string;
  apollo_query?: string;
};

type WorkspaceSearchOutcome = {
  success: boolean;
  contacts: SearchResultContact[];
  error?: string;
};

type PlatformProspectsSearchOutcome = {
  success: boolean;
  contacts: SearchResultContact[];
  error?: string;
};

function isApolloUnavailableError(error: unknown) {
  return (
    error instanceof ApolloApiError &&
    (error.code === "NOT_CONNECTED" || error.status === 401 || error.status === 403)
  );
}

async function runApolloSearch(query: string): Promise<ApolloSearchOutcome> {
  try {
    await resolveApolloConnectorAccount();
  } catch (error) {
    if (isApolloUnavailableError(error)) {
      console.log("[Apollo Search] Not connected, will search global platform_prospects instead");
      return { success: false, contacts: [] };
    }
    if (error instanceof ApolloApiError) {
      return { success: false, contacts: [], error: error.message };
    }
    throw error;
  }

  try {
    console.log("[Apollo Search] Query:", query);
    const intent = await parseApolloSearchIntent(query);
    console.log("[Apollo Search] Parsed intent:", JSON.stringify(intent, null, 2));
    const filters = searchIntentToApolloFilters(intent, query);
    console.log("[Apollo Search] Filters:", JSON.stringify(filters, null, 2));

    const apolloResult = await withApolloAccount(undefined, async ({ accessToken }) =>
      searchApolloPeople(accessToken, filters),
    );
    console.log("[Apollo Search] Results:", apolloResult.people?.length ?? 0, "people");

    const people = apolloResult.people ?? [];
    const { prospects } = await upsertPlatformProspectsFromApollo(people, "search");

    const { workspaceId } = await getUserWorkspaceContext();
    const linkedContactIds = workspaceId
      ? await getLinkedContactIdsForProspects(
          prospects.map((prospect) => prospect.id),
          workspaceId,
        )
      : new Map<string, string>();

    const contacts = mapPlatformProspectsToSearchContacts(prospects, linkedContactIds).map(
      (contact) => ({
        ...contact,
        source: "platform" as const,
      }),
    );

    return {
      success: true,
      contacts,
      apollo_query: describeApolloSearchFilters(filters),
    };
  } catch (error) {
    if (isApolloUnavailableError(error)) {
      return { success: false, contacts: [] };
    }
    if (error instanceof ApolloApiError) {
      return { success: false, contacts: [], error: error.message };
    }
    throw error;
  }
}

async function runPlatformProspectsSearch(query: string): Promise<PlatformProspectsSearchOutcome> {
  try {
    console.log("[Platform Prospects Search] Searching query:", query);
    const prospects = await searchPlatformProspects(query, 20);
    
    const { workspaceId } = await getUserWorkspaceContext();
    const linkedContactIds = workspaceId
      ? await getLinkedContactIdsForProspects(
          prospects.map((prospect) => prospect.id),
          workspaceId,
        )
      : new Map<string, string>();

    const contacts = mapPlatformProspectsToSearchContacts(prospects, linkedContactIds).map(
      (contact) => ({
        ...contact,
        source: "platform" as const,
      }),
    );

    return {
      success: true,
      contacts,
    };
  } catch (error) {
    console.error("[Platform Prospects Search] Error:", error);
    return {
      success: false,
      contacts: [],
      error: error instanceof Error ? error.message : "Platform prospects search failed",
    };
  }
}

async function runWorkspaceSearch(
  query: string,
  workspaceId?: string,
  ownerId?: string,
): Promise<WorkspaceSearchOutcome> {
  try {
    console.log("[Workspace Search] Query:", query);
    const [, contacts] = await Promise.all([
      parseSearchIntent(query),
      searchContactsForQuery(query, {
        workspaceId,
        ownerId,
      }),
    ]);
    console.log("[Workspace Search] Found contacts:", contacts.length);

    const ownerById = new Map(
      contacts.map((contact) => [contact.id, contact.network_owner_name ?? null]),
    );
    const groupById = new Map(
      contacts.map((contact) => [contact.id, contact.group_name ?? null]),
    );

    return {
      success: true,
      contacts: contacts.map((contact) => ({
        id: contact.id,
        full_name: contact.full_name,
        title: contact.title,
        email: contact.email,
        company_name: contact.company_name,
        score: Math.round((contact.similarity ?? 0.8) * 100),
        reason: "Relevant match in your network",
        warm_intro_path: ["You"],
        recommended_action: "Reach out via warm introduction or direct email",
        network_owner_name: ownerById.get(contact.id) ?? contact.network_owner_name ?? null,
        group_name: groupById.get(contact.id) ?? contact.group_name ?? null,
        source: "workspace" as const,
      })),
    };
  } catch (error) {
    console.error("[Workspace Search] Error:", error);
    return {
      success: false,
      contacts: [],
      error: error instanceof Error ? error.message : "Workspace search failed",
    };
  }
}

function buildSearchSources(
  apollo: ApolloSearchOutcome,
  workspace: WorkspaceSearchOutcome,
  platformProspects: PlatformProspectsSearchOutcome,
): SearchSources {
  // If Apollo succeeded, show Apollo stats; otherwise show platform_prospects stats
  const apolloStats = apollo.success
    ? {
        success: apollo.success,
        count: apollo.contacts.length,
        ...(apollo.error ? { error: apollo.error } : {}),
      }
    : {
        success: platformProspects.success,
        count: platformProspects.contacts.length,
        ...(platformProspects.error
          ? { error: platformProspects.error }
          : !apollo.success && apollo.error
            ? { error: `Apollo unavailable: ${apollo.error}` }
            : {}),
      };

  return {
    apollo: apolloStats,
    workspace: {
      success: workspace.success,
      count: workspace.contacts.length,
      ...(workspace.error ? { error: workspace.error } : {}),
    },
  };
}

function buildMergedSummary(
  query: string,
  totalCount: number,
  sources: SearchSources,
  rankedSummary: string,
) {
  if (totalCount > 0) {
    return rankedSummary;
  }

  const apolloUnavailable = !sources.apollo.success && sources.apollo.error;
  if (apolloUnavailable && sources.workspace.success) {
    return `No matches found in your contacts for "${query}". Apollo search was unavailable. Try refining your query or reconnect Apollo in Connectors.`;
  }

  if (sources.apollo.success && sources.workspace.success) {
    return `No matches found for "${query}" in Apollo or your contacts. Try broadening the role, industry, or location.`;
  }

  return rankedSummary;
}

function buildSuggestedActions(totalCount: number, sources: SearchSources, existing: string[]) {
  if (totalCount > 0) {
    return existing;
  }

  const actions = [
    "Try a broader role or industry",
    "Search for people already in your network",
    "Add Apollo prospects to contacts after you find a match",
  ];

  if (!sources.apollo.success && sources.apollo.error) {
    actions.unshift("Reconnect Apollo in Connectors");
  }

  return actions;
}

export async function POST(request: Request) {
  try {
    const disabled = await featureDisabledResponse("ai_search", "AI search");
    if (disabled) return disabled;

    const body = await request.json();
    const { query, workspace_id: workspaceId, filters } = searchSchema.parse(body);

    const supabase = await createClient();
    const { user } = await safeGetSessionUser(supabase);
    if (user && (await isFeatureEnabled("billing_enforcement"))) {
      await assertSearchAllowed(supabase, user.id);
    }

    const ownerId = typeof filters?.owner_id === "string" ? filters.owner_id : undefined;

    const [apolloSettled, workspaceSettled, platformProspectsSettled] = await Promise.allSettled([
      runApolloSearch(query),
      runWorkspaceSearch(query, workspaceId, ownerId),
      runPlatformProspectsSearch(query),
    ]);

    const apolloOutcome: ApolloSearchOutcome =
      apolloSettled.status === "fulfilled"
        ? apolloSettled.value
        : {
            success: false,
            contacts: [],
            error:
              apolloSettled.reason instanceof Error
                ? apolloSettled.reason.message
                : "Apollo search failed",
          };

    const workspaceOutcome: WorkspaceSearchOutcome =
      workspaceSettled.status === "fulfilled"
        ? workspaceSettled.value
        : {
            success: false,
            contacts: [],
            error:
              workspaceSettled.reason instanceof Error
                ? workspaceSettled.reason.message
                : "Workspace search failed",
          };

    const platformProspectsOutcome: PlatformProspectsSearchOutcome =
      platformProspectsSettled.status === "fulfilled"
        ? platformProspectsSettled.value
        : {
            success: false,
            contacts: [],
            error:
              platformProspectsSettled.reason instanceof Error
                ? platformProspectsSettled.reason.message
                : "Platform prospects search failed",
          };

    // If Apollo is not connected, use platform prospects instead
    const apolloContacts = apolloOutcome.success
      ? apolloOutcome.contacts
      : platformProspectsOutcome.contacts;
    
    const apolloContactSource = apolloOutcome.success ? "apollo" : "platform_prospects";
    console.log("[Search Merge] Using", apolloContactSource, "for Apollo results");

    const mergedContacts = deduplicateSearchContacts(apolloContacts, workspaceOutcome.contacts);
    console.log(
      "[Search Merge]",
      apolloContactSource + ":",
      apolloContacts.length,
      "Workspace:",
      workspaceOutcome.contacts.length,
      "Merged:",
      mergedContacts.length,
    );
    const mergedById = new Map(mergedContacts.map((contact) => [contact.id, contact]));
    const ranked = await rankAndExplain(query, mergedContacts);
    console.log("[Search Rank] Ranked:", ranked.contacts.length, "contacts");
    const sources = buildSearchSources(apolloOutcome, workspaceOutcome, platformProspectsOutcome);

    const response = {
      ...ranked,
      contacts: ranked.contacts.map((contact) => ({
        ...(mergedById.get(contact.id) ?? {}),
        ...contact,
      })),
      summary: buildMergedSummary(query, mergedContacts.length, sources, ranked.summary),
      suggested_actions: buildSuggestedActions(
        mergedContacts.length,
        sources,
        ranked.suggested_actions ?? [],
      ),
      source: "merged" as const,
      sources,
      ...(apolloOutcome.apollo_query ? { apollo_query: apolloOutcome.apollo_query } : {}),
    };

    await saveSearchHistory(query, response, workspaceId);

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 402 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof ApolloApiError) {
      console.error("Apollo search failed:", error);
      return NextResponse.json(
        { error: error.message, code: error.code ?? "APOLLO_ERROR" },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
      );
    }
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
