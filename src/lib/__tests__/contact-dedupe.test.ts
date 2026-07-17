import { describe, expect, it } from "vitest";
import {
  buildMergedContactUpdate,
  findExistingContact,
  indexExistingContacts,
  normalizeEmail,
  type ExistingContactMatch,
} from "@/lib/contacts/contact-dedupe";

function contact(partial: Partial<ExistingContactMatch> & Pick<ExistingContactMatch, "id" | "full_name">): ExistingContactMatch {
  return {
    email: null,
    external_id: null,
    title: null,
    company_name: null,
    phone: null,
    linkedin_url: null,
    twitter_url: null,
    location: null,
    first_name: null,
    last_name: null,
    strength_score: 0,
    metadata: null,
    ...partial,
  };
}

describe("contact dedupe", () => {
  it("matches by email across sources even when external_id differs", () => {
    const indexes = indexExistingContacts([
      contact({
        id: "1",
        full_name: "Alex Morgan",
        email: "Alex@Acme.com",
        external_id: "csv-or-none",
      }),
    ]);

    const match = findExistingContact(indexes, {
      external_id: "people/google-123",
      email: "alex@acme.com",
      full_name: "Alex Morgan",
    });

    expect(match?.id).toBe("1");
  });

  it("matches by name when email is missing", () => {
    const indexes = indexExistingContacts([
      contact({ id: "2", full_name: "Jordan Lee", email: null }),
    ]);

    expect(
      findExistingContact(indexes, {
        full_name: "jordan  lee",
        email: null,
      })?.id,
    ).toBe("2");
  });

  it("does not name-match when emails differ", () => {
    const indexes = indexExistingContacts([
      contact({ id: "3", full_name: "Sam Patel", email: "sam@a.com" }),
    ]);

    expect(
      findExistingContact(indexes, {
        full_name: "Sam Patel",
        email: "sam@b.com",
      }),
    ).toBeNull();
  });

  it("merges fields without wiping enrichment", () => {
    const existing = contact({
      id: "4",
      full_name: "Alex Morgan",
      email: "alex@acme.com",
      title: "CEO",
      company_name: "Acme",
      linkedin_url: "https://linkedin.com/in/alex",
      strength_score: 70,
      metadata: { industry: "Fintech", sources: ["csv"] },
    });

    const merged = buildMergedContactUpdate({
      existing,
      incoming: {
        full_name: "Alex Morgan",
        email: "alex@acme.com",
        title: null,
        company_name: null,
        external_id: "people/google-1",
        strength_score: 40,
      },
      source: "google_contacts",
      metadataIncoming: { import_batch_id: "x" },
    });

    expect(merged.title).toBe("CEO");
    expect(merged.company_name).toBe("Acme");
    expect(merged.linkedin_url).toBe("https://linkedin.com/in/alex");
    expect(merged.strength_score).toBe(70);
    expect(merged.metadata.industry).toBe("Fintech");
    expect(merged.metadata.sources).toEqual(["csv", "google_contacts"]);
    expect(merged.metadata.external_ids).toEqual({ google_contacts: "people/google-1" });
    expect(normalizeEmail(merged.email)).toBe("alex@acme.com");
  });
});
