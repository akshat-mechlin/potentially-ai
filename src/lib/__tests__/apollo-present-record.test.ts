import { describe, expect, it } from "vitest";
import {
  formatApolloLastRefreshed,
  getApolloAvailabilityFlags,
  getApolloPersonDisplayName,
  isApolloSearchPreview,
  isUnverifiedApolloStub,
} from "@/lib/integrations/apollo/present-record";

describe("present-record", () => {
  it("builds display name from obfuscated last name", () => {
    expect(
      getApolloPersonDisplayName({
        first_name: "Ryan",
        last_name_obfuscated: "Ot***i",
      }),
    ).toBe("Ryan Ot***i");
  });

  it("returns availability flags for preview payload", () => {
    const flags = getApolloAvailabilityFlags(
      {
        has_email: true,
        has_direct_phone: "Yes",
        organization: { has_industry: true, has_employee_count: true },
      },
      "person",
    );

    expect(flags.map((flag) => flag.label)).toEqual(
      expect.arrayContaining(["Email available", "Direct phone available", "Industry available"]),
    );
  });

  it("detects search preview mode", () => {
    expect(
      isApolloSearchPreview({
        first_name: "Ryan",
        last_name_obfuscated: "Ot***i",
        has_email: true,
      }),
    ).toBe(true);
  });

  it("formats last refreshed date", () => {
    expect(formatApolloLastRefreshed("2026-07-14T00:42:55.000+00:00")).toMatch(/Last refreshed/);
  });

  it("marks fallback ids as unverified stubs", () => {
    expect(isUnverifiedApolloStub("contact:abc")).toBe(true);
    expect(isUnverifiedApolloStub("email:test@example.com")).toBe(true);
    expect(isUnverifiedApolloStub("66fc9d250cbf9000016694f7")).toBe(false);
  });
});
