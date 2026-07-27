import { randomBytes } from "crypto";
import type { ConnectorKey } from "@/lib/connectors/types";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { resolveOAuthReturnOrigin } from "@/lib/app-url";

export const CONNECTOR_OAUTH_STATE_COOKIE = "potentially_connector_oauth";

export type ConnectorOAuthStatePayload = {
  state: string;
  connectorKey: ConnectorKey;
  userId: string;
  redirectUri: string;
  exp: number;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

export function getConnectorOAuthCallbackUrl(request: Request) {
  return `${resolveOAuthReturnOrigin(request)}/api/connectors/oauth/callback`;
}

/** Redirect URIs to register on Google Cloud / Azure AD (Web). */
export function getConnectorOAuthCallbackAllowlistUrls() {
  const urls = new Set<string>();
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (configured) {
    urls.add(`${configured}/api/connectors/oauth/callback`);
  }
  urls.add("http://localhost:1020/api/connectors/oauth/callback");
  return [...urls];
}

export function supportsDirectConnectorOAuth(connectorKey: ConnectorKey) {
  const provider = getConnectorDefinition(connectorKey)?.oauth?.provider;
  return provider === "google" || provider === "azure" || provider === "apollo";
}

export function getConnectorOAuthProvider(connectorKey: ConnectorKey) {
  return getConnectorDefinition(connectorKey)?.oauth?.provider ?? null;
}

export function createConnectorOAuthState(
  connectorKey: ConnectorKey,
  userId: string,
  redirectUri: string,
): ConnectorOAuthStatePayload {
  return {
    state: randomBytes(24).toString("hex"),
    connectorKey,
    userId,
    redirectUri,
    exp: Date.now() + 10 * 60 * 1000,
  };
}

export function encodeConnectorOAuthStateCookie(payload: ConnectorOAuthStatePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeConnectorOAuthStateCookie(
  raw: string | undefined,
): ConnectorOAuthStatePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<
      ConnectorOAuthStatePayload
    >;
    if (
      !parsed.state ||
      !parsed.connectorKey ||
      !parsed.userId ||
      !parsed.redirectUri ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp < Date.now()) return null;
    return parsed as ConnectorOAuthStatePayload;
  } catch {
    return null;
  }
}

export function buildGoogleAuthorizeUrl(params: {
  scopes: string;
  redirectUri: string;
  state: string;
}) {
  const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientId) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID is missing. Add it to .env (same client as Google Cloud / Supabase Google provider).",
    );
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scopes);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export function buildAzureAuthorizeUrl(params: {
  scopes: string;
  redirectUri: string;
  state: string;
}) {
  const clientId = requireEnv("AZURE_OAUTH_CLIENT_ID");
  if (!clientId) {
    throw new Error(
      "AZURE_OAUTH_CLIENT_ID is missing. Add AZURE_OAUTH_CLIENT_ID and AZURE_OAUTH_CLIENT_SECRET to .env (same app as Supabase Azure provider).",
    );
  }
  const tenant = requireEnv("AZURE_OAUTH_TENANT") ?? "common";

  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", params.scopes);
  url.searchParams.set("state", params.state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeGoogleAuthorizationCode(params: {
  code: string;
  redirectUri: string;
}) {
  const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET missing. Add them to .env, then try Connect again.",
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
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
    throw new Error(json.error_description || json.error || "Google token exchange failed.");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    idToken: null as string | null,
  };
}

export async function exchangeAzureAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  scopes: string;
}) {
  const clientId = requireEnv("AZURE_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("AZURE_OAUTH_CLIENT_SECRET");
  const tenant = requireEnv("AZURE_OAUTH_TENANT") ?? "common";
  if (!clientId || !clientSecret) {
    throw new Error(
      "AZURE_OAUTH_CLIENT_ID / AZURE_OAUTH_CLIENT_SECRET missing. Add them to .env, then try Connect again.",
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
    scope: params.scopes,
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Microsoft token exchange failed.");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    idToken: json.id_token ?? null,
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function profileFromAzureIdToken(idToken: string | null | undefined) {
  if (!idToken) return null;
  const claims = decodeJwtPayload(idToken);
  if (!claims) return null;

  const email =
    (typeof claims.email === "string" && claims.email.trim()) ||
    (typeof claims.preferred_username === "string" && claims.preferred_username.trim()) ||
    (typeof claims.upn === "string" && claims.upn.trim()) ||
    null;
  const oid = typeof claims.oid === "string" ? claims.oid.trim() : null;
  const name = typeof claims.name === "string" ? claims.name.trim() : null;
  const providerAccountId = oid || email || `azure-${Date.now()}`;

  return {
    providerAccountId,
    accountEmail: email,
    accountLabel: email ?? name ?? providerAccountId,
  };
}

export async function fetchGoogleAccountProfile(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    id?: string;
    email?: string;
    name?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message || "Failed to load Google account profile.");
  }
  const email = json.email?.trim() || null;
  const providerAccountId = json.id?.trim() || email || `google-${Date.now()}`;
  return {
    providerAccountId,
    accountEmail: email,
    accountLabel: email ?? json.name ?? providerAccountId,
  };
}

export async function fetchAzureAccountProfile(
  accessToken: string,
  idToken?: string | null,
) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    id?: string;
    mail?: string | null;
    userPrincipalName?: string | null;
    displayName?: string | null;
    error?: { message?: string; code?: string };
  };

  if (res.ok) {
    const email =
      json.mail?.trim() ||
      json.userPrincipalName?.trim() ||
      null;
    const providerAccountId = json.id?.trim() || email || `azure-${Date.now()}`;
    return {
      providerAccountId,
      accountEmail: email,
      accountLabel: email ?? json.displayName?.trim() ?? providerAccountId,
    };
  }

  // Token may lack User.Read (Insufficient privileges). Fall back to ID token claims.
  const fromIdToken = profileFromAzureIdToken(idToken);
  if (fromIdToken) {
    console.warn("[connector.oauth] Graph /me failed; using ID token profile", {
      status: res.status,
      message: json.error?.message,
    });
    return fromIdToken;
  }

  throw new Error(
    json.error?.message ||
      "Failed to load Microsoft account profile. Add User.Read on the Azure app and try Connect again.",
  );
}
