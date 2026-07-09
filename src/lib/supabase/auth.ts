import type { SupabaseClient, User } from "@supabase/supabase-js";

export function isSupabaseNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as { message?: string; cause?: { code?: string } };
  const message = err.message?.toLowerCase() ?? "";
  const causeCode = err.cause?.code ?? "";

  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    causeCode === "UND_ERR_CONNECT_TIMEOUT" ||
    causeCode === "ECONNREFUSED" ||
    causeCode === "ENOTFOUND"
  );
}

export type SessionUser = {
  id: string;
  email: string | null;
};

/** Fast session check from the JWT in cookies — no Auth server round-trip. */
export async function safeGetSessionUser(supabase: SupabaseClient): Promise<{
  user: SessionUser | null;
  networkError: boolean;
}> {
  try {
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      const message = error.message?.toLowerCase() ?? "";
      const isMissingSession =
        message.includes("auth session missing") || message.includes("jwt expired");
      if (!isMissingSession) {
        console.error("Supabase getClaims error:", error.message);
      }
      return { user: null, networkError: false };
    }

    const claims = data?.claims;
    const userId = claims?.sub;
    if (typeof userId !== "string") {
      return { user: null, networkError: false };
    }

    const email = typeof claims?.email === "string" ? claims.email : null;
    return { user: { id: userId, email }, networkError: false };
  } catch (error) {
    if (isSupabaseNetworkError(error)) {
      console.warn("Supabase is unreachable (network timeout). Check VPN, firewall, or internet.");
      return { user: null, networkError: true };
    }

    throw error;
  }
}

export async function safeGetUser(supabase: SupabaseClient): Promise<{
  user: User | null;
  networkError: boolean;
}> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      const message = error.message?.toLowerCase() ?? "";
      const isMissingSession =
        message.includes("auth session missing") || message.includes("jwt expired");
      if (!isMissingSession) {
        console.error("Supabase getUser error:", error.message);
      }
      return { user: null, networkError: false };
    }

    return { user: data.user, networkError: false };
  } catch (error) {
    if (isSupabaseNetworkError(error)) {
      console.warn("Supabase is unreachable (network timeout). Check VPN, firewall, or internet.");
      return { user: null, networkError: true };
    }

    throw error;
  }
}
