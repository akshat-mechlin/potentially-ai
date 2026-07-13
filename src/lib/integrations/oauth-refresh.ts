/**
 * Refresh Google / Microsoft provider access tokens stored on data_connectors.
 * Requires the same OAuth client credentials configured in Supabase Auth providers.
 *
 * GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET
 * AZURE_OAUTH_CLIENT_ID / AZURE_OAUTH_CLIENT_SECRET  (optional AZURE_OAUTH_TENANT, default "common")
 */

export type RefreshedProviderTokens = {
  accessToken: string;
  refreshToken: string | null;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<RefreshedProviderTokens> {
  const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google token expired and refresh is not configured. Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env (same values as Supabase → Auth → Google), then reconnect.",
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        "Google refresh failed. Reconnect Google Contacts from Connectors.",
    );
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
  };
}

export async function refreshAzureAccessToken(
  refreshToken: string,
  scopes: string,
): Promise<RefreshedProviderTokens> {
  const clientId = requireEnv("AZURE_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("AZURE_OAUTH_CLIENT_SECRET");
  const tenant = requireEnv("AZURE_OAUTH_TENANT") ?? "common";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Microsoft token expired and refresh is not configured. Add AZURE_OAUTH_CLIENT_ID and AZURE_OAUTH_CLIENT_SECRET to .env (same values as Supabase → Auth → Azure), then reconnect.",
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: scopes,
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        "Microsoft refresh failed. Reconnect Outlook from Connectors.",
    );
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
  };
}

export function isUnauthorizedProviderResponse(status: number, body: string) {
  if (status === 401 || status === 403) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("invalid_grant") ||
    lower.includes("invalid credentials") ||
    lower.includes("token has been expired") ||
    lower.includes("lifetime validation failed") ||
    lower.includes("expired")
  );
}
