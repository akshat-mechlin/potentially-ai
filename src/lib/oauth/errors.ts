import { getConnectorDefinition } from "@/lib/connectors/registry";
import type { ConnectorKey } from "@/lib/connectors/types";

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
    return `${providerLabel} is not enabled in Supabase. Open Authentication → Providers in your Supabase project, turn on ${providerLabel}, and add the OAuth client ID and secret from the provider's developer console.`;
  }

  if (normalized.includes("manual linking")) {
    return `Account linking is disabled. In Supabase go to Authentication → Settings and enable "Manual linking" to connect multiple accounts.`;
  }

  if (normalized.includes("redirect") || normalized.includes("callback")) {
    return `OAuth redirect URL mismatch. Add ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/callback to Supabase → Authentication → URL Configuration → Redirect URLs.`;
  }

  return message;
}
