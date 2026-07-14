import { getConnectorDefinition } from "@/lib/connectors/registry";
import type { ConnectorKey } from "@/lib/connectors/types";
import { getOAuthCallbackAllowlistUrls } from "@/lib/oauth/scopes";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  azure: "Microsoft (Azure)",
  github: "GitHub",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  apple: "Apple",
  linkedin_oidc: "LinkedIn",
};

export function getProviderLabel(supabaseProvider: string) {
  return PROVIDER_LABELS[supabaseProvider] ?? supabaseProvider;
}

export function getSupabaseProvidersUrl() {
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (ref) {
    return `https://supabase.com/dashboard/project/${ref}/auth/providers`;
  }
  return "https://supabase.com/dashboard/project/_/auth/providers";
}

export function formatOAuthError(error: unknown, connectorKey?: ConnectorKey): string {
  const def = connectorKey ? getConnectorDefinition(connectorKey) : null;
  const provider = def?.oauth?.supabaseProvider;
  const providerLabel = provider ? getProviderLabel(provider) : "OAuth";

  let message = "Failed to start sign-in.";
  let code: string | undefined;

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object") {
    const record = error as { message?: string; msg?: string; error_code?: string };
    message = record.message ?? record.msg ?? message;
    code = record.error_code;
  } else if (typeof error === "string") {
    message = error;
  }

  try {
    const parsed = JSON.parse(message) as { msg?: string; error_code?: string };
    if (parsed.msg) message = parsed.msg;
    if (parsed.error_code) code = parsed.error_code;
  } catch {
    // not JSON
  }

  const normalized = message.toLowerCase();

  if (
    normalized.includes("provider is not enabled") ||
    normalized.includes("unsupported provider") ||
    code === "validation_failed"
  ) {
    return `${providerLabel} is not enabled in Supabase. Open Authentication → Providers, turn on ${providerLabel}, and paste the OAuth client ID and secret.`;
  }

  if (normalized.includes("manual linking")) {
    return `Account linking is disabled. In Supabase go to Authentication → Providers (or Auth settings) and enable Manual linking so you can connect Google/Microsoft while already signed in.`;
  }

  if (
    normalized.includes("redirect") ||
    normalized.includes("callback") ||
    normalized.includes("redirect_uri_mismatch")
  ) {
    const urls = getOAuthCallbackAllowlistUrls().join(" and ");
    return `OAuth redirect URL mismatch. In Supabase → Authentication → URL Configuration, add: ${urls}`;
  }

  if (
    normalized.includes("identity is already linked") ||
    normalized.includes("identity_already_exists")
  ) {
    if (normalized.includes("another user")) {
      return `${providerLabel} is already linked to a different Potentially user. Pick a different account, or sign in with that ${providerLabel} account instead.`;
    }
    return `${providerLabel} is already linked to this user. Click Connect again — we'll re-prompt for access so tokens can be saved.`;
  }

  return message;
}
