import { describe, expect, it } from "vitest";
import { deduplicateSearchContacts } from "@/lib/data/search-deduplication";
import type { SearchResultContact } from "@/types";

function workspaceContact(overrides: Partial<SearchResultContact> = {}): SearchResultContact {
  return {
    id: "contact-1",
    full_name: "Jane Doe",
    title: "VP Sales",
    email: "jane@example.com",
    company_name: "Acme",
    score: 90,
    reason: "Network match",
    warm_intro_path: ["You"],
    recommended_action: "Reach out",
    ...overrides,
  };
}

function apolloContact(overrides: Partial<SearchResultContact> = {}): SearchResultContact {
  return {
    id: "prospect-1",
    full_name: "Jane Doe",
    title: "VP Sales",
    email: "jane@example.com",
    company_name: "Acme",
    score: 85,
    reason: "Apollo match",
    warm_intro_path: [],
    recommended_action: "Enrich",
    source: "platform",
    platform_prospect_id: "prospect-1",
    apollo_id: "apollo-1",
    ...overrides,
  };
}

describe("deduplicateSearchContacts", () => {
  it("keeps workspace contacts when email matches", () => {
    const result = deduplicateSearchContacts(
      [apolloContact()],
      [workspaceContact()],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("workspace");
    expect(result[0]?.id).toBe("contact-1");
  });

  it("keeps workspace contacts when apollo_id matches", () => {
    const result = deduplicateSearchContacts(
      [apolloContact({ email: "different@example.com" })],
      [workspaceContact({ email: "jane@work.com", apollo_id: "apollo-1" })],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("workspace");
  });

  it("keeps workspace contacts when platform_prospect_id matches", () => {
    const result = deduplicateSearchContacts(
      [apolloContact({ email: null })],
      [workspaceContact({ email: null, platform_prospect_id: "prospect-1" })],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("workspace");
  });

  it("keeps workspace contacts when name and company match", () => {
    const result = deduplicateSearchContacts(
      [apolloContact({ email: null, apollo_id: undefined, platform_prospect_id: "prospect-2" })],
      [workspaceContact({ email: null })],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("workspace");
  });

  it("returns both sources when there are no duplicates", () => {
    const result = deduplicateSearchContacts(
      [apolloContact({ id: "prospect-2", email: "apollo@example.com", full_name: "John Smith" })],
      [workspaceContact()],
    );

    expect(result).toHaveLength(2);
    expect(result.some((contact) => contact.source === "workspace")).toBe(true);
    expect(result.some((contact) => contact.source === "platform")).toBe(true);
  });

  it("enriches workspace contact with Apollo fields when duplicate found", () => {
    const result = deduplicateSearchContacts(
      [apolloContact({ title: "Chief Revenue Officer", enrichment_status: "enriched" })],
      [workspaceContact({ title: null, apollo_id: undefined, platform_prospect_id: undefined })],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Chief Revenue Officer");
    expect(result[0]?.platform_prospect_id).toBe("prospect-1");
    expect(result[0]?.apollo_id).toBe("apollo-1");
    expect(result[0]?.enrichment_status).toBe("enriched");
  });
});
