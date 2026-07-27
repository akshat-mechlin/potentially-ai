import { describe, expect, it } from "vitest";
import {
  describeApolloSearchFilters,
  searchIntentToApolloFilters,
} from "@/lib/integrations/apollo/search-intent-to-filters";

describe("searchIntentToApolloFilters", () => {
  it("maps NLP intent fields to Apollo people filters", () => {
    const filters = searchIntentToApolloFilters({
      intent: "search",
      apollo_keywords: "enterprise SaaS fintech Stripe",
      filters: {
        roles: ["VP Sales", "Head of Marketing"],
        industries: ["SaaS", "fintech"],
        keywords: ["enterprise"],
        companies: ["Stripe"],
        locations: ["San Francisco"],
      },
    });

    expect(filters.person_titles).toEqual(["VP Sales", "Head of Marketing"]);
    expect(filters.person_locations).toEqual(["San Francisco"]);
    expect(filters.q_keywords).toEqual(["enterprise SaaS fintech Stripe"]);
    expect(filters.q_organization_keyword_tags).toEqual(
      expect.arrayContaining(["SaaS", "fintech", "Stripe"]),
    );
    expect(filters.person_seniorities).toContain("vp");
    expect(filters.page).toBe(1);
    expect(filters.per_page).toBe(25);
  });

  it("falls back to the raw NLP query when structured filters are sparse", () => {
    const filters = searchIntentToApolloFilters(
      { intent: "search", filters: {} },
      "founders at AI startups in Austin",
    );

    expect(filters.q_keywords).toEqual(["founders at AI startups in Austin"]);
  });

  it("describes the Apollo query in plain language", () => {
    const filters = searchIntentToApolloFilters({
      intent: "search",
      filters: {
        roles: ["CEO"],
        locations: ["New York"],
        industries: ["SaaS"],
      },
    });

    expect(describeApolloSearchFilters(filters)).toContain("titles: CEO");
    expect(describeApolloSearchFilters(filters)).toContain("locations: New York");
  });
});
