import { describe, expect, it } from "vitest";
import { matchContactsForPlaybook } from "@/lib/playbooks/matching";
import type { Contact } from "@/types";

const baseContact: Contact = {
  id: "c1",
  workspace_id: "w1",
  owner_id: "u1",
  full_name: "Jane Doe",
  first_name: "Jane",
  last_name: "Doe",
  title: "CTO",
  email: "jane@fintech.io",
  phone: null,
  linkedin_url: null,
  company_id: null,
  company_name: "FinTech Co",
  location: null,
  bio: "Building payments infra",
  tags: ["fintech"],
  source: null,
  strength_score: 75,
  last_interaction_at: null,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("matchContactsForPlaybook", () => {
  it("matches contacts by title and keywords", () => {
    const results = matchContactsForPlaybook(
      [baseContact],
      { title_include: ["cto"], keywords_nice: ["fintech"], min_strength_score: 20 },
      { min_score: 30 },
      "warm_preferred",
      { ownerNames: new Map([["u1", "Alex Morgan"]]), activeContactIds: new Set(), doNotContactIds: new Set(), currentUserId: "u1" },
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.contact.id).toBe("c1");
    expect(results[0]?.score).toBeGreaterThanOrEqual(30);
  });

  it("skips contacts in active playbooks when deduping", () => {
    const results = matchContactsForPlaybook(
      [baseContact],
      { title_include: ["cto"], min_strength_score: 20 },
      { min_score: 30, dedupe_across_playbooks: true },
      "warm_preferred",
      { activeContactIds: new Set(["c1"]), doNotContactIds: new Set(), ownerNames: new Map(), currentUserId: "u1" },
    );

    expect(results).toHaveLength(0);
  });
});
