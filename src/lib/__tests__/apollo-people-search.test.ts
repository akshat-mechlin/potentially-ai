import { describe, expect, it } from "vitest";
import { apolloPeopleSearchRequestParams } from "@/lib/integrations/apollo/people-search";

describe("apolloPeopleSearchRequestParams", () => {
  it("serializes q_keywords as a comma-separated string for Apollo", () => {
    const params = apolloPeopleSearchRequestParams({
      person_titles: ["VP Sales"],
      q_keywords: ["enterprise", "SaaS"],
      page: 1,
      per_page: 25,
    });

    expect(params.person_titles).toEqual(["VP Sales"]);
    expect(params.q_keywords).toBe("enterprise, SaaS");
  });

  it("omits q_keywords when empty", () => {
    const params = apolloPeopleSearchRequestParams({
      person_titles: ["CEO"],
      q_keywords: [],
    });

    expect(params.q_keywords).toBeUndefined();
  });
});
