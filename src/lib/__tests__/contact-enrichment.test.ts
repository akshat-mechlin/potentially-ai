import { describe, expect, it } from "vitest";
import {
  computeLeadScore,
  contactEnrichmentBlob,
  contactSearchSnippet,
} from "@/lib/contacts/enrichment";
import { contactEmbeddingText } from "@/lib/data/embeddings";

describe("contact enrichment scoring", () => {
  it("scores richer Apollo rows higher than name-only rows", () => {
    const sparse = computeLeadScore({
      title: null,
      company_name: null,
      email: "a@b.com",
    });
    const rich = computeLeadScore({
      title: "CEO",
      company_name: "Acme",
      email: "ceo@acme.com",
      linkedin_url: "https://linkedin.com/in/ceo",
      location: "San Francisco, CA",
      extras: {
        seniority: "C-Level",
        industry: "Fintech",
        employees: "120",
        total_funding: "$40M",
        email_status: "Verified",
      },
    });
    expect(rich).toBeGreaterThan(sparse);
    expect(rich).toBeGreaterThanOrEqual(70);
  });

  it("includes enrichment in embedding and search snippet text", () => {
    const source = {
      full_name: "Alex Morgan",
      title: "CEO",
      company_name: "Acme",
      extras: {
        industry: "Venture Capital",
        seniority: "C-Level",
        keywords: "fintech,b2b",
      },
    };
    expect(contactEnrichmentBlob(source)).toContain("industry: Venture Capital");
    expect(contactSearchSnippet(source)).toContain("C-Level");
    expect(contactEmbeddingText(source)).toContain("Venture Capital");
  });
});
