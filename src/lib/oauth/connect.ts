import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import type { ConnectorKey } from "@/lib/connectors/types";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { formatOAuthError } from "@/lib/oauth/errors";
import {
  getConnectRedirectUrl,
  getOAuthConfig,
  setPendingConnectorCookie,
} from "@/lib/oauth/scopes";
import type { Provider, User } from "@supabase/supabase-js";

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

function userHasProviderIdentity(user: User | null, provider: string) {
  return Boolean(user?.identities?.some((identity) => identity.provider === provider));
}

function oauthQueryParams(supabaseProvider: string): Record<string, string> {
  // Google: offline + consent ensures refresh_token is issued (and re-issued on reconnect).
  if (supabaseProvider === "google") {
    return { access_type: "offline", prompt: "consent select_account" };
  }
  return { prompt: "consent" };
}

/**
 * Start OAuth for a connector.
 *
 * If Google/Microsoft is already linked to this user (typical after "Sign in with Google"),
 * linkIdentity fails AFTER redirect with identity_already_exists and no UI feedback.
 * In that case we skip linking and use signInWithOAuth to re-consent contacts scopes
 * and land provider_token on the session.
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

  setPendingConnectorCookie(connectorKey);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const queryParams = oauthQueryParams(oauth.supabaseProvider);
  const oauthProvider = asSupabaseProvider(oauth.supabaseProvider);
  const redirectTo = getConnectRedirectUrl(connectorKey);
  const options = {
    redirectTo,
    scopes: oauth.scopes,
    queryParams,
  };

  const alreadyLinked = userHasProviderIdentity(user, oauth.supabaseProvider);

  // Prefer linkIdentity only when this provider is not already on the account.
  if (user && !alreadyLinked) {
    const linked = await supabase.auth.linkIdentity({
      provider: oauthProvider,
      options,
    });

    if (linked.error) {
      throw new Error(formatOAuthError(linked.error, connectorKey));
    }

    if (!linked.data?.url) {
      throw new Error(
        "Google did not return a link URL. Check Supabase → Authentication → Providers → Google.",
      );
    }

    window.location.assign(linked.data.url);
    return { redirecting: true as const };
  }

  const signedIn = await supabase.auth.signInWithOAuth({
    provider: oauthProvider,
    options,
  });

  if (signedIn.error) {
    throw new Error(formatOAuthError(signedIn.error, connectorKey));
  }

  if (!signedIn.data?.url) {
    throw new Error(
      "Google did not return a sign-in URL. Check Supabase → Authentication → Providers → Google is enabled, then try again.",
    );
  }

  window.location.assign(signedIn.data.url);
  return { redirecting: true as const };
}
