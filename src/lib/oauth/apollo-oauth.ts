const APOLLO_TOKEN_URL = "https://app.apollo.io/api/v1/oauth/token";
const APOLLO_PROFILE_URL = "https://app.apollo.io/api/v1/users/api_profile";

export type ApolloTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

export function buildApolloAuthorizeUrl(params: {
  scopes: string;
  redirectUri: string;
  state: string;
}) {
  const clientId = requireEnv("APOLLO_OAUTH_CLIENT_ID");
  if (!clientId) {
    throw new Error(
      "APOLLO_OAUTH_CLIENT_ID is missing. Register Potentially in Apollo OAuth settings, then add the client ID to .env.",
    );
  }

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: params.scopes,
    state: params.state,
  });

  return `https://app.apollo.io/#/oauth/authorize?${query.toString()}`;
}

async function postApolloToken(body: URLSearchParams): Promise<ApolloTokenResponse> {
  const res = await fetch(APOLLO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as Partial<ApolloTokenResponse> & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description || json.error || "Apollo token exchange failed. Try Connect again.",
    );
  }

  return json as ApolloTokenResponse;
}

export async function exchangeApolloAuthorizationCode(params: {
  code: string;
  redirectUri: string;
}) {
  const clientId = requireEnv("APOLLO_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("APOLLO_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(
      "APOLLO_OAUTH_CLIENT_ID / APOLLO_OAUTH_CLIENT_SECRET missing. Add them to .env after Apollo partner registration.",
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: params.redirectUri,
    code: params.code,
  });

  const tokens = await postApolloToken(body);
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scope: tokens.scope,
  };
}

export async function refreshApolloAccessToken(refreshToken: string) {
  const clientId = requireEnv("APOLLO_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("APOLLO_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(
      "Apollo token expired and refresh is not configured. Add APOLLO_OAUTH_* to .env, then reconnect Apollo.",
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokens = await postApolloToken(body);
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scope: tokens.scope,
  };
}

export async function fetchApolloUserProfile(accessToken: string) {
  const res = await fetch(APOLLO_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = (await res.json()) as {
    user?: {
      id?: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      name?: string;
    };
    error?: string;
    error_message?: string;
  };

  if (!res.ok) {
    throw new Error(json.error_message || json.error || "Failed to load Apollo account profile.");
  }

  const user = json.user;
  const email = user?.email?.trim() || null;
  const name =
    user?.name?.trim() ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    null;
  const providerAccountId = user?.id?.trim() || email || `apollo-${Date.now()}`;

  return {
    providerAccountId,
    accountEmail: email,
    accountLabel: email ?? name ?? providerAccountId,
  };
}

export function apolloTokenExpiresAt(expiresInSeconds: number) {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

/** Apollo returns non-standard OAuth errors on the redirect URL. */
export function parseApolloOAuthCallbackError(searchParams: URLSearchParams): string | null {
  const statusCode = searchParams.get("status_code");
  const errorMessage = searchParams.get("error_message");
  if (statusCode === "403" && errorMessage) {
    return decodeURIComponent(errorMessage.replace(/\+/g, " "));
  }
  if (errorMessage) {
    return decodeURIComponent(errorMessage.replace(/\+/g, " "));
  }
  return null;
}
