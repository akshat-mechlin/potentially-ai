import { describe, it, expect } from "vitest";
import { isDemoMode, DEMO_CONTACTS } from "@/lib/demo-data";

describe("demo-data", () => {
  it("has demo contacts", () => {
    expect(DEMO_CONTACTS.length).toBeGreaterThan(0);
    expect(DEMO_CONTACTS[0]).toHaveProperty("full_name");
    expect(DEMO_CONTACTS[0]).toHaveProperty("email");
  });

  it("detects demo mode", () => {
    expect(typeof isDemoMode()).toBe("boolean");
  });
});
