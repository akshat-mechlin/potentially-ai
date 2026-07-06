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
  const redirectTo = getConnectRedirectUrl(connectorKey);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const queryParams: Record<string, string> =
    oauth.supabaseProvider === "google"
      ? { access_type: "offline", prompt: "consent select_account" }
      : { prompt: "consent select_account" };

  const options = {
    redirectTo,
    scopes: oauth.scopes,
    queryParams,
  };

  const oauthProvider = asSupabaseProvider(oauth.supabaseProvider);

  if (user) {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: oauthProvider,
      options,
    });

    if (error) {
      throw new Error(formatOAuthError(error, connectorKey));
    }

    if (data?.url) {
      window.location.href = data.url;
      return { redirecting: true as const };
    }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: oauthProvider,
    options,
  });

  if (error) {
    throw new Error(formatOAuthError(error, connectorKey));
  }

  if (data?.url) {
    window.location.href = data.url;
  }

  return { redirecting: true as const };
}
