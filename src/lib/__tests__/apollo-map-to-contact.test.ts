import { describe, expect, it } from "vitest";
import { mapApolloPersonToImportRow } from "@/lib/integrations/apollo/map-to-contact";
import type { ApolloPerson } from "@/lib/integrations/apollo/types";

describe("mapApolloPersonToImportRow", () => {
  it("maps Apollo person fields into Potentially enrichment metadata", () => {
    const person: ApolloPerson = {
      id: "abc123",
      name: "Jane Doe",
      title: "VP Sales",
      email: "jane@acme.com",
      linkedin_url: "https://linkedin.com/in/jane",
      seniority: "vp",
      city: "San Francisco",
      state: "California",
      country: "United States",
      organization: {
        id: "org1",
        name: "Acme Inc",
        industry: "Software",
        estimated_num_employees: 250,
        primary_domain: "acme.com",
      },
    };

    const row = mapApolloPersonToImportRow(person);
    expect(row).not.toBeNull();
    expect(row?.full_name).toBe("Jane Doe");
    expect(row?.external_id).toBe("apollo:abc123");
    expect(row?.extras?.seniority).toBe("vp");
    expect(row?.extras?.industry).toBe("Software");
    expect(row?.extras?.employees).toBe("250");
    expect(row?.extras?.apollo_person_id).toBe("abc123");
  });
});
