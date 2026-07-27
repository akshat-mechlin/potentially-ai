import { describe, expect, it, vi, beforeEach } from "vitest";
import { enrichPlatformProspects } from "@/lib/data/platform-prospects";

vi.mock("@/lib/data/workspace", () => ({
  getUserWorkspaceContext: vi.fn(),
}));

vi.mock("@/lib/data/audit", () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock("@/lib/data/contacts", () => ({
  importContactsFromSource: vi.fn(),
}));

vi.mock("@/lib/integrations/apollo/client", () => ({
  withApolloAccount: vi.fn(),
}));

vi.mock("@/lib/integrations/apollo/people-enrichment", () => ({
  enrichApolloPerson: vi.fn(),
}));

import { getUserWorkspaceContext } from "@/lib/data/workspace";
import { importContactsFromSource } from "@/lib/data/contacts";
import { withApolloAccount } from "@/lib/integrations/apollo/client";
import { enrichApolloPerson } from "@/lib/integrations/apollo/people-enrichment";

describe("enrichPlatformProspects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the platform row and syncs linked workspace contacts", async () => {
    const prospect = {
      id: "prospect-1",
      apollo_id: "apollo-1",
      record_type: "person" as const,
      name: "Jane Doe",
      title: "CEO",
      email: null,
      phone: null,
      company_name: "Acme",
      location: null,
      linkedin_url: null,
      primary_domain: "acme.com",
      enrichment_status: "none",
      enriched_at: null,
      raw_apollo: { id: "apollo-1", first_name: "Jane", last_name: "Doe" },
      metadata: {},
      first_seen_at: "2026-01-01T00:00:00.000Z",
      last_seen_at: "2026-01-01T00:00:00.000Z",
      search_hit_count: 1,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const enrichedProspect = {
      ...prospect,
      enrichment_status: "enriched",
      email: "jane@acme.com",
    };

    const getProspectChain = {
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi
          .fn()
          .mockResolvedValueOnce({ data: prospect, error: null })
          .mockResolvedValueOnce({ data: enrichedProspect, error: null }),
      }),
    };

    const updateProspect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: enrichedProspect,
            error: null,
          }),
        }),
      }),
    });

    const linkedContacts = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ id: "contact-1" }], error: null }),
        }),
      }),
    });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "platform_prospects") {
          return {
            select: vi.fn().mockReturnValue(getProspectChain),
            update: updateProspect,
          };
        }
        if (table === "contacts") {
          return linkedContacts();
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1", email: "test@example.com" } as never,
      workspaceId: "ws-1",
      profile: null,
    });
    vi.mocked(withApolloAccount).mockImplementation(async (_accountId, fn) =>
      fn({ accessToken: "token" } as never),
    );
    vi.mocked(enrichApolloPerson).mockResolvedValue({
      person: {
        id: "apollo-1",
        email: "jane@acme.com",
        first_name: "Jane",
        last_name: "Doe",
        organization: { name: "Acme" },
      },
    } as never);
    vi.mocked(importContactsFromSource).mockResolvedValue({ imported: 1 } as never);

    const results = await enrichPlatformProspects({
      ids: ["prospect-1"],
      syncToContacts: true,
    });

    expect(results[0]?.status).toBe("enriched");
    expect(updateProspect).toHaveBeenCalled();
    expect(importContactsFromSource).toHaveBeenCalled();
  });
});
