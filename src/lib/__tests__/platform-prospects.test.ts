import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  mapPlatformProspectsToSearchContacts,
  upsertPlatformProspectsFromRecords,
  type PlatformProspect,
} from "@/lib/data/platform-prospects";

vi.mock("@/lib/data/workspace", () => ({
  getUserWorkspaceContext: vi.fn(),
}));

vi.mock("@/lib/data/audit", () => ({
  logAuditEvent: vi.fn(),
}));

import { getUserWorkspaceContext } from "@/lib/data/workspace";

function baseProspect(overrides: Partial<PlatformProspect>): PlatformProspect {
  return {
    id: "87a22886-a1e7-4a48-992f-615aeec22dd1",
    apollo_id: "66fa5bf3a9886c0001a32a6f",
    record_type: "person",
    name: "Ada Lovelace",
    title: "Engineer",
    email: "ada@example.com",
    phone: null,
    company_name: "Analytical Engines",
    location: null,
    linkedin_url: null,
    primary_domain: "example.com",
    enrichment_status: "none",
    enriched_at: null,
    raw_apollo: { id: "66fa5bf3a9886c0001a32a6f" },
    metadata: {},
    first_seen_at: "2026-01-01T00:00:00.000Z",
    last_seen_at: "2026-01-01T00:00:00.000Z",
    search_hit_count: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapPlatformProspectsToSearchContacts", () => {
  it("marks linked prospects as in_contacts", () => {
    const prospect = baseProspect({});
    const linked = new Map([[prospect.id, "contact-123"]]);
    const [result] = mapPlatformProspectsToSearchContacts([prospect], linked);

    expect(result.source).toBe("platform");
    expect(result.platform_prospect_id).toBe(prospect.id);
    expect(result.in_contacts).toBe(true);
    expect(result.id).toBe("contact-123");
  });
});

describe("upsertPlatformProspectsFromRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bumps search_hit_count when the same apollo_id is saved again", async () => {
    const existing = baseProspect({ search_hit_count: 4, enrichment_status: "enriched", email: "rich@example.com" });
    const upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ ...existing, search_hit_count: 5 }],
        error: null,
      }),
    });
    const selectExisting = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: [existing], error: null }),
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== "platform_prospects") throw new Error(`unexpected table ${table}`);
        return {
          select: selectExisting,
          upsert,
        };
      }),
    };

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1", email: "test@example.com" } as never,
      workspaceId: "ws-1",
      profile: null,
    });

    const result = await upsertPlatformProspectsFromRecords(
      [
        {
          apollo_id: existing.apollo_id,
          record_type: "person",
          name: "Preview Name",
          email: "preview@example.com",
          raw_apollo: { id: existing.apollo_id },
        },
      ],
      "search",
    );

    expect(result.saved).toBe(1);
    const payload = upsert.mock.calls[0]?.[0]?.[0];
    expect(payload.search_hit_count).toBe(5);
    expect(payload.email).toBe("rich@example.com");
  });
});
