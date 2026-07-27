import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApolloApiError } from "@/lib/integrations/apollo/client";

vi.mock("@/lib/ai/openai", () => ({
  parseSearchIntent: vi.fn(),
  parseApolloSearchIntent: vi.fn(),
  rankAndExplain: vi.fn(),
}));

vi.mock("@/lib/billing/enforce", () => ({
  assertSearchAllowed: vi.fn(),
  PlanLimitError: class PlanLimitError extends Error {},
}));

vi.mock("@/lib/data/contacts", () => ({
  saveSearchHistory: vi.fn(),
  searchContactsForQuery: vi.fn(),
}));

vi.mock("@/lib/data/feature-flags", () => ({
  featureDisabledResponse: vi.fn().mockResolvedValue(null),
  isFeatureEnabled: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/data/platform-prospects", () => ({
  upsertPlatformProspectsFromApollo: vi.fn(),
  getLinkedContactIdsForProspects: vi.fn(),
  mapPlatformProspectsToSearchContacts: vi.fn(),
}));

vi.mock("@/lib/data/workspace", () => ({
  getUserWorkspaceContext: vi.fn().mockResolvedValue({ workspaceId: "ws-1" }),
}));

vi.mock("@/lib/integrations/apollo/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/integrations/apollo/client")>();
  return {
    ...actual,
    resolveApolloConnectorAccount: vi.fn(),
    withApolloAccount: vi.fn(),
  };
});

vi.mock("@/lib/integrations/apollo/search-intent-to-filters", () => ({
  searchIntentToApolloFilters: vi.fn().mockReturnValue({ page: 1, per_page: 25 }),
  describeApolloSearchFilters: vi.fn().mockReturnValue("titles: CEO"),
}));

vi.mock("@/lib/integrations/apollo/people-search", () => ({
  searchApolloPeople: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/supabase/auth", () => ({
  safeGetSessionUser: vi.fn().mockResolvedValue({ user: null }),
}));

import { parseApolloSearchIntent, parseSearchIntent, rankAndExplain } from "@/lib/ai/openai";
import { saveSearchHistory, searchContactsForQuery } from "@/lib/data/contacts";
import {
  getLinkedContactIdsForProspects,
  mapPlatformProspectsToSearchContacts,
  upsertPlatformProspectsFromApollo,
} from "@/lib/data/platform-prospects";
import { resolveApolloConnectorAccount, withApolloAccount } from "@/lib/integrations/apollo/client";
import { searchApolloPeople } from "@/lib/integrations/apollo/people-search";
import { POST } from "@/app/api/search/route";

describe("POST /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns merged Apollo and workspace results", async () => {
    vi.mocked(resolveApolloConnectorAccount).mockResolvedValue({
      account: { id: "acc-1" },
    } as never);
    vi.mocked(parseApolloSearchIntent).mockResolvedValue({
      intent: "search",
      apollo_keywords: "CEO SaaS",
      filters: { roles: ["CEO"] },
    });
    vi.mocked(withApolloAccount).mockImplementation(async (_accountId, fn) =>
      fn({ accessToken: "token" } as never),
    );
    vi.mocked(searchApolloPeople).mockResolvedValue({
      people: [{ id: "apollo-1", name: "Jane Doe" }],
    } as never);
    vi.mocked(upsertPlatformProspectsFromApollo).mockResolvedValue({
      saved: 1,
      prospects: [
        {
          id: "prospect-1",
          apollo_id: "apollo-1",
          name: "Jane Doe",
          enrichment_status: "none",
        },
      ],
    } as never);
    vi.mocked(getLinkedContactIdsForProspects).mockResolvedValue(new Map());
    vi.mocked(mapPlatformProspectsToSearchContacts).mockReturnValue([
      {
        id: "prospect-1",
        full_name: "Jane Doe",
        title: null,
        email: "jane@example.com",
        company_name: null,
        score: 90,
        reason: "Apollo search match",
        warm_intro_path: [],
        recommended_action: "Enrich for details",
        source: "platform",
        platform_prospect_id: "prospect-1",
      },
    ]);
    vi.mocked(searchContactsForQuery).mockResolvedValue([
      {
        id: "contact-1",
        full_name: "Local Contact",
        title: null,
        email: "local@example.com",
        company_name: null,
        similarity: 0.9,
        network_owner_name: "You",
        group_name: "Default",
      },
    ] as never);
    vi.mocked(parseSearchIntent).mockResolvedValue({ intent: "search" });
    vi.mocked(rankAndExplain).mockResolvedValue({
      contacts: [
        { id: "contact-1", full_name: "Local Contact", score: 95, reason: "network match" },
        { id: "prospect-1", full_name: "Jane Doe", score: 90, reason: "apollo match" },
      ],
      summary: "Merged results",
      suggested_actions: [],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/search", {
        method: "POST",
        body: JSON.stringify({ query: "CEOs in SaaS" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("merged");
    expect(body.contacts).toHaveLength(2);
    expect(body.sources.apollo.success).toBe(true);
    expect(body.sources.apollo.count).toBe(1);
    expect(body.sources.workspace.success).toBe(true);
    expect(body.sources.workspace.count).toBe(1);
    expect(searchApolloPeople).toHaveBeenCalled();
    expect(searchContactsForQuery).toHaveBeenCalled();
    expect(saveSearchHistory).toHaveBeenCalled();
  });

  it("deduplicates Apollo results when the same person exists in workspace contacts", async () => {
    vi.mocked(resolveApolloConnectorAccount).mockResolvedValue({
      account: { id: "acc-1" },
    } as never);
    vi.mocked(parseApolloSearchIntent).mockResolvedValue({ intent: "search", filters: {} });
    vi.mocked(withApolloAccount).mockImplementation(async (_accountId, fn) =>
      fn({ accessToken: "token" } as never),
    );
    vi.mocked(searchApolloPeople).mockResolvedValue({ people: [{ id: "apollo-1" }] } as never);
    vi.mocked(upsertPlatformProspectsFromApollo).mockResolvedValue({
      saved: 1,
      prospects: [{ id: "prospect-1", apollo_id: "apollo-1", name: "Jane Doe" }],
    } as never);
    vi.mocked(getLinkedContactIdsForProspects).mockResolvedValue(new Map());
    vi.mocked(mapPlatformProspectsToSearchContacts).mockReturnValue([
      {
        id: "prospect-1",
        full_name: "Jane Doe",
        title: null,
        email: "jane@example.com",
        company_name: "Acme",
        score: 90,
        reason: "Apollo search match",
        warm_intro_path: [],
        recommended_action: "Enrich for details",
        source: "platform",
        platform_prospect_id: "prospect-1",
      },
    ]);
    vi.mocked(searchContactsForQuery).mockResolvedValue([
      {
        id: "contact-1",
        full_name: "Jane Doe",
        title: "VP Sales",
        email: "jane@example.com",
        company_name: "Acme",
        similarity: 0.95,
      },
    ] as never);
    vi.mocked(parseSearchIntent).mockResolvedValue({ intent: "search" });
    vi.mocked(rankAndExplain).mockResolvedValue({
      contacts: [{ id: "contact-1", full_name: "Jane Doe", score: 95, reason: "network match" }],
      summary: "One match",
      suggested_actions: [],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/search", {
        method: "POST",
        body: JSON.stringify({ query: "Jane Doe" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contacts).toHaveLength(1);
    expect(body.contacts[0]?.source).toBe("workspace");
    expect(body.sources.apollo.count).toBe(1);
    expect(body.sources.workspace.count).toBe(1);
  });

  it("returns workspace results when Apollo is not connected", async () => {
    vi.mocked(resolveApolloConnectorAccount).mockRejectedValue(
      new ApolloApiError("Not connected", 403, "NOT_CONNECTED"),
    );
    vi.mocked(searchContactsForQuery).mockResolvedValue([
      {
        id: "contact-1",
        full_name: "Local Contact",
        title: null,
        email: null,
        company_name: null,
        similarity: 0.8,
        network_owner_name: "You",
        group_name: "Default",
      },
    ] as never);
    vi.mocked(parseSearchIntent).mockResolvedValue({ intent: "search" });
    vi.mocked(rankAndExplain).mockResolvedValue({
      contacts: [{ id: "contact-1", full_name: "Local Contact", score: 80, reason: "match" }],
      summary: "Workspace results",
      suggested_actions: [],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/search", {
        method: "POST",
        body: JSON.stringify({ query: "design partners" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("merged");
    expect(body.contacts).toHaveLength(1);
    expect(body.sources.apollo.success).toBe(false);
    expect(body.sources.workspace.success).toBe(true);
    expect(searchContactsForQuery).toHaveBeenCalled();
    expect(searchApolloPeople).not.toHaveBeenCalled();
  });

  it("returns Apollo results with a notice when workspace search is empty", async () => {
    vi.mocked(resolveApolloConnectorAccount).mockResolvedValue({
      account: { id: "acc-1" },
    } as never);
    vi.mocked(parseApolloSearchIntent).mockResolvedValue({ intent: "search", filters: {} });
    vi.mocked(withApolloAccount).mockImplementation(async (_accountId, fn) =>
      fn({ accessToken: "token" } as never),
    );
    vi.mocked(searchApolloPeople).mockResolvedValue({
      people: [{ id: "apollo-1", name: "Jane Doe" }],
    } as never);
    vi.mocked(upsertPlatformProspectsFromApollo).mockResolvedValue({
      saved: 1,
      prospects: [{ id: "prospect-1", apollo_id: "apollo-1", name: "Jane Doe" }],
    } as never);
    vi.mocked(getLinkedContactIdsForProspects).mockResolvedValue(new Map());
    vi.mocked(mapPlatformProspectsToSearchContacts).mockReturnValue([
      {
        id: "prospect-1",
        full_name: "Jane Doe",
        title: null,
        email: null,
        company_name: null,
        score: 90,
        reason: "Apollo search match",
        warm_intro_path: [],
        recommended_action: "Enrich for details",
        source: "platform",
        platform_prospect_id: "prospect-1",
      },
    ]);
    vi.mocked(searchContactsForQuery).mockResolvedValue([]);
    vi.mocked(parseSearchIntent).mockResolvedValue({ intent: "search" });
    vi.mocked(rankAndExplain).mockResolvedValue({
      contacts: [{ id: "prospect-1", full_name: "Jane Doe", score: 90, reason: "apollo match" }],
      summary: "Apollo results",
      suggested_actions: [],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/search", {
        method: "POST",
        body: JSON.stringify({ query: "VCs in fintech" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contacts).toHaveLength(1);
    expect(body.contacts[0]?.source).toBe("platform");
    expect(body.sources.apollo.count).toBe(1);
    expect(body.sources.workspace.count).toBe(0);
  });
});
