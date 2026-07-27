import { describe, expect, it } from "vitest";
import { buildPersonEnrichInput } from "@/lib/integrations/apollo/build-enrich-input";
import type { ApolloRecord } from "@/lib/data/apollo-records";

function baseRecord(overrides: Partial<ApolloRecord>): ApolloRecord {
  return {
    id: "87a22886-a1e7-4a48-992f-615aeec22dd1",
    record_type: "person",
    apollo_id: "66fa5bf3a9886c0001a32a6f",
    name: "Ralph Ad***o",
    title: "Founder & Chief Executive Officer",
    email: null,
    phone: null,
    company_name: "ADET IT SOLUTIONS",
    location: null,
    linkedin_url: null,
    primary_domain: null,
    enrichment_status: "none",
    enriched_at: null,
    raw_apollo: {
      id: "66fa5bf3a9886c0001a32a6f",
      first_name: "Ralph",
      title: "Founder & Chief Executive Officer",
      organization: { name: "ADET IT SOLUTIONS" },
    },
    metadata: {},
    first_seen_at: "2026-01-01T00:00:00.000Z",
    last_seen_at: "2026-01-01T00:00:00.000Z",
    search_hit_count: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildPersonEnrichInput", () => {
  it("uses Apollo person id for search-saved records instead of obfuscated name", () => {
    const input = buildPersonEnrichInput(baseRecord({}));

    expect(input.id).toBe("66fa5bf3a9886c0001a32a6f");
    expect(input.name).toBeUndefined();
    expect(input.email).toBeUndefined();
  });

  it("does not send obfuscated name for contact stubs", () => {
    const input = buildPersonEnrichInput(
      baseRecord({
        apollo_id: "contact:abc",
        name: "Ralph Ad***o",
      }),
    );

    expect(input.id).toBeUndefined();
    expect(input.name).toBeUndefined();
    expect(input.first_name).toBe("Ralph");
  });
});
