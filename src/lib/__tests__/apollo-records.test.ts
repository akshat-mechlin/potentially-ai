import { describe, expect, it } from "vitest";
import { canEnrichApolloRecord } from "@/lib/data/apollo-records";
import type { ApolloRecord } from "@/lib/data/apollo-records";

function baseRecord(overrides: Partial<ApolloRecord>): ApolloRecord {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    record_type: "person",
    apollo_id: "66fc9d250cbf9000016694f7",
    name: "Ryan Ot***i",
    title: "CEO",
    email: null,
    phone: null,
    company_name: "Intelligent IT",
    location: null,
    linkedin_url: null,
    primary_domain: null,
    enrichment_status: "none",
    enriched_at: null,
    raw_apollo: {},
    metadata: {},
    first_seen_at: "2026-01-01T00:00:00.000Z",
    last_seen_at: "2026-01-01T00:00:00.000Z",
    search_hit_count: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("apollo-records enrich validation", () => {
  it("allows enrich when name and company are present", () => {
    expect(canEnrichApolloRecord(baseRecord({}))).toEqual({ ok: true });
  });

  it("skips enrich when match data is insufficient for unverified stubs", () => {
    expect(
      canEnrichApolloRecord(
        baseRecord({
          apollo_id: "contact:abc",
          name: "Ryan",
          company_name: null,
          email: null,
          linkedin_url: null,
          primary_domain: null,
        }),
      ),
    ).toEqual({ ok: false, reason: "insufficient_match_data" });
  });

  it("allows organization enrich with domain", () => {
    expect(
      canEnrichApolloRecord(
        baseRecord({
          record_type: "organization",
          primary_domain: "intelligentit.com",
        }),
      ),
    ).toEqual({ ok: true });
  });
});
