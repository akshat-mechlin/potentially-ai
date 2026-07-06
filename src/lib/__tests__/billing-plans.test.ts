import { describe, expect, it } from "vitest";
import { getPlanLimits, normalizePlan, PLANS } from "@/lib/billing/plans";

describe("billing plans", () => {
  it("normalizes unknown plans to free", () => {
    expect(normalizePlan("starter")).toBe("free");
    expect(normalizePlan("pro")).toBe("pro");
  });

  it("returns free plan limits by default", () => {
    const limits = getPlanLimits(undefined);
    expect(limits.maxContacts).toBe(PLANS.free.maxContacts);
    expect(limits.maxSearchesPerMonth).toBe(50);
  });

  it("returns unlimited searches for pro", () => {
    const limits = getPlanLimits("pro");
    expect(limits.maxSearchesPerMonth).toBe(Number.POSITIVE_INFINITY);
  });
});
