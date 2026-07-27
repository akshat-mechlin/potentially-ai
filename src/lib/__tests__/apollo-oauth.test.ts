import { describe, expect, it } from "vitest";
import {
  apolloTokenExpiresAt,
  parseApolloOAuthCallbackError,
} from "@/lib/oauth/apollo-oauth";

describe("apollo oauth helpers", () => {
  it("parses Apollo permission errors from callback query params", () => {
    const params = new URLSearchParams(
      "status_code=403&error_message=You%20do%20not%20have%20permission%20to%20connect%20integrations",
    );
    expect(parseApolloOAuthCallbackError(params)).toBe(
      "You do not have permission to connect integrations",
    );
  });

  it("computes token expiry timestamps from expires_in seconds", () => {
    const now = Date.now();
    const expiresAt = apolloTokenExpiresAt(3600);
    const parsed = Date.parse(expiresAt);
    expect(parsed - now).toBeGreaterThan(3_500_000);
    expect(parsed - now).toBeLessThan(3_700_000);
  });
});
