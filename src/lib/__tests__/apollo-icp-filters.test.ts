import { describe, expect, it } from "vitest";
import {
  icpToApolloPeopleFilterForm,
  icpToApolloPeopleFilters,
  peopleFormToFilters,
} from "@/lib/integrations/apollo/icp-to-filters";
import type { IcpProfile } from "@/types/playbooks";

describe("icpToApolloPeopleFilters", () => {
  it("maps playbook ICP fields to Apollo search filters", () => {
    const icp: IcpProfile = {
      title_include: ["VP Sales", "Head of Sales"],
      geographies: ["San Francisco", "United States"],
      keywords_must: ["SaaS"],
      industries_include: ["Software"],
    };

    const filters = icpToApolloPeopleFilters(icp);
    expect(filters.person_titles).toEqual(["VP Sales", "Head of Sales"]);
    expect(filters.person_locations).toEqual(["San Francisco", "United States"]);
    expect(filters.q_organization_keyword_tags).toEqual(["SaaS", "Software"]);
    expect(filters.person_seniorities).toContain("vp");
  });

  it("maps ICP into editable people filter form fields", () => {
    const form = icpToApolloPeopleFilterForm({
      title_include: ["VP Sales"],
      geographies: ["United States"],
      keywords_must: ["SaaS"],
      industries_include: ["Software"],
    });
    expect(form.person_titles).toBe("VP Sales");
    expect(form.person_locations).toBe("United States");
    expect(form.q_organization_keyword_tags).toContain("SaaS");
    expect(peopleFormToFilters(form).person_titles).toEqual(["VP Sales"]);
  });
});
