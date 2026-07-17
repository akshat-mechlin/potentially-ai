import { describe, expect, it } from "vitest";
import {
  buildFallbackContactSummary,
  finalizeContactSummary,
  isIncompleteSummary,
  sanitizeContactSummary,
  shouldUseDeterministicSummary,
} from "@/lib/ai/contact-summary";

describe("sanitizeContactSummary", () => {
  it("strips draft meta commentary like the broken Tommy summary", () => {
    const raw = `".
• Draft: "Tommy Diehl is a professional." (A bit too sparse, but accurate to the zero-data`;

    expect(sanitizeContactSummary(raw)).toBe("Tommy Diehl is a professional.");
  });

  it("returns empty when only meta remains", () => {
    expect(sanitizeContactSummary("Draft: (too sparse)")).toBe("");
  });

  it("keeps a normal multi-paragraph summary", () => {
    const raw = `CJ is the Co-Founder and CEO of Diamond Kinetics.

• Industry: Sports tech
• Based in Pittsburgh`;
    expect(sanitizeContactSummary(raw)).toContain("Co-Founder and CEO");
    expect(sanitizeContactSummary(raw)).toContain("Industry: Sports tech");
  });
});

describe("isIncompleteSummary", () => {
  it("flags mid-sentence cutoffs like the Sarah Chen bug", () => {
    expect(
      isIncompleteSummary(
        "Sarah Chen is the CTO of Stripe. Based in San Francisco, California, she is an engineering leader with more than",
      ),
    ).toBe(true);
  });

  it("accepts finished summaries", () => {
    expect(
      isIncompleteSummary(
        "Sarah Chen is the CTO of Stripe. Based in San Francisco, CA. Engineering leader with 15+ years in fintech infrastructure.",
      ),
    ).toBe(false);
  });
});

describe("generateContactSummary helpers", () => {
  it("uses deterministic path for zero-data contacts", () => {
    const contact = {
      full_name: "Tommy Diehl via TestFlight",
      title: null,
      company_name: null,
      bio: null,
      tags: [],
      enrichment: {},
    };
    expect(shouldUseDeterministicSummary(contact)).toBe(true);
    expect(buildFallbackContactSummary(contact)).toBe(
      "Tommy Diehl via TestFlight is in your network.",
    );
  });

  it("builds a complete contextual fallback for known contacts", () => {
    const summary = buildFallbackContactSummary({
      full_name: "Sarah Chen",
      title: "CTO",
      company_name: "Stripe",
      location: "San Francisco, CA",
      bio: "Engineering leader with 15+ years in fintech infrastructure.",
      tags: ["fintech", "engineering", "cto"],
      enrichment: { Industry: "Financial services", Seniority: "C-Level" },
    });

    expect(summary).toContain("Sarah Chen is the CTO of Stripe.");
    expect(summary).toContain("Based in San Francisco, CA.");
    expect(summary).toContain("15+ years in fintech infrastructure.");
    expect(summary).toContain("• Seniority: C-Level");
    expect(summary).toContain("• Industry: Financial services");
    expect(isIncompleteSummary(summary)).toBe(false);
  });

  it("finalizes bad model output to a clean sentence", () => {
    const contact = {
      full_name: "Tommy Diehl",
      title: null,
      company_name: null,
      bio: null,
      tags: [],
    };
    expect(
      finalizeContactSummary('Draft: "hi" (too sparse, zero-data', contact),
    ).toBe("Tommy Diehl is in your network.");
  });

  it("rejects truncated model prose and uses full contact context", () => {
    const contact = {
      full_name: "Sarah Chen",
      title: "CTO",
      company_name: "Stripe",
      location: "San Francisco, CA",
      bio: "Engineering leader with 15+ years in fintech infrastructure.",
      tags: ["fintech"],
    };

    const result = finalizeContactSummary(
      "Sarah Chen is the CTO of Stripe. Based in San Francisco, California, she is an engineering leader with more than",
      contact,
    );

    expect(result).toContain("Sarah Chen is the CTO of Stripe.");
    expect(result).toContain("15+ years in fintech infrastructure.");
    expect(result).not.toMatch(/with more than$/);
    expect(isIncompleteSummary(result)).toBe(false);
  });
});
