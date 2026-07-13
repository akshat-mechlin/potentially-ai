import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import type { ConnectorKey } from "@/lib/connectors/types";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { formatOAuthError } from "@/lib/oauth/errors";
import { getConnectRedirectUrl, getOAuthConfig } from "@/lib/oauth/scopes";
import type { Provider } from "@supabase/supabase-js";

const SUPPORTED_PROVIDERS = new Set<string>([
  "apple",
  "azure",
  "facebook",
  "github",
  "google",
  "linkedin_oidc",
  "twitter",
]);

function asSupabaseProvider(provider: string): Provider {
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(`OAuth provider "${provider}" is not supported yet.`);
  }
  return provider as Provider;
}

function isIdentityAlreadyLinked(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("identity is already linked") ||
    normalized.includes("identity_already_exists") ||
    normalized.includes("already linked") ||
    normalized.includes("already been linked")
  );
}

function oauthQueryParams(supabaseProvider: string): Record<string, string> {
  // Google: offline + consent ensures refresh_token is issued (and re-issued on reconnect).
  // Azure: prompt must be a single value — consent forces new Contacts.Read grants.
  if (supabaseProvider === "google") {
    return { access_type: "offline", prompt: "consent select_account" };
  }
  return { prompt: "consent" };
}

async function startOAuthRedirect(
  supabase: ReturnType<typeof createClient>,
  connectorKey: ConnectorKey,
  oauthProvider: Provider,
  scopes: string,
  queryParams: Record<string, string>,
  mode: "link" | "signin",
) {
  const redirectTo = getConnectRedirectUrl(connectorKey);
  const options = { redirectTo, scopes, queryParams };

  if (mode === "link") {
    return supabase.auth.linkIdentity({ provider: oauthProvider, options });
  }
  return supabase.auth.signInWithOAuth({ provider: oauthProvider, options });
}

/**
 * Start OAuth for a connector.
 * Prefer linkIdentity when logged in; if that identity is already linked
 * (e.g. user signed in with Google), fall back to signInWithOAuth so we can
 * re-consent and capture provider_token / refresh_token on the session.
 */
export async function connectConnector(connectorKey: ConnectorKey) {
  const def = getConnectorDefinition(connectorKey);
  if (!def) throw new Error("Unknown connector");

  if (def.availability === "coming_soon") {
    throw new Error(`${def.name} is coming soon.`);
  }

  if (connectorKey === "custom_data") {
    throw new Error("Use Import to upload custom data.");
  }

  const oauth = getOAuthConfig(connectorKey);
  if (!oauth) {
    throw new Error(`${def.name} does not support OAuth connection yet.`);
  }

  if (isDemoMode()) {
    return { demo: true as const, connectorKey };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const queryParams = oauthQueryParams(oauth.supabaseProvider);
  const oauthProvider = asSupabaseProvider(oauth.supabaseProvider);

  if (user) {
    const linked = await startOAuthRedirect(
      supabase,
      connectorKey,
      oauthProvider,
      oauth.scopes,
      queryParams,
      "link",
    );

    if (!linked.error && linked.data?.url) {
      window.location.href = linked.data.url;
      return { redirecting: true as const };
    }

    if (linked.error && !isIdentityAlreadyLinked(linked.error)) {
      throw new Error(formatOAuthError(linked.error, connectorKey));
    }
    // Identity already linked → continue with sign-in to refresh scopes/tokens.
  }

  const signedIn = await startOAuthRedirect(
    supabase,
    connectorKey,
    oauthProvider,
    oauth.scopes,
    queryParams,
    "signin",
  );

  if (signedIn.error) {
    throw new Error(formatOAuthError(signedIn.error, connectorKey));
  }

  if (signedIn.data?.url) {
    window.location.href = signedIn.data.url;
  }

  return { redirecting: true as const };
}
