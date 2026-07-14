import type { ConnectorKey } from "@/lib/connectors/types";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { getClientAppOrigin } from "@/lib/app-url";

export const PENDING_CONNECTOR_COOKIE = "potentially_oauth_connector";

/**
 * Prefer the public app origin (not localhost behind a tunnel) for OAuth redirectTo.
 */
export function getConnectRedirectUrl(connectorKey: ConnectorKey) {
  const origin = getClientAppOrigin();
  // Encode next so Supabase preserves both query params on the way back.
  const next = encodeURIComponent("/connectors");
  return `${origin}/api/auth/callback?next=${next}&connector=${connectorKey}`;
}

export function getOAuthConfig(connectorKey: ConnectorKey) {
  const def = getConnectorDefinition(connectorKey);
  if (!def?.oauth) return null;
  return def.oauth;
}

export function isOAuthConnector(connectorKey: ConnectorKey) {
  return Boolean(getConnectorDefinition(connectorKey)?.oauth);
}

/** Redirect URLs that must be listed in Supabase Auth → URL Configuration. */
export function getOAuthCallbackAllowlistUrls() {
  const urls = new Set<string>();
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "").replace(/\/$/, "");
  if (configured) {
    urls.add(`${configured}/api/auth/callback`);
    urls.add(`${configured}/**`);
  }
  urls.add("http://localhost:1020/api/auth/callback");
  urls.add("http://localhost:1020/**");
  if (typeof window !== "undefined") {
    urls.add(`${window.location.origin}/api/auth/callback`);
    urls.add(`${window.location.origin}/**`);
  }
  return [...urls];
}

/** Survives Supabase stripping query params from redirectTo. */
export function setPendingConnectorCookie(connectorKey: ConnectorKey) {
  if (typeof document === "undefined") return;
  document.cookie = `${PENDING_CONNECTOR_COOKIE}=${encodeURIComponent(connectorKey)}; Path=/; Max-Age=600; SameSite=Lax`;
  try {
    sessionStorage.setItem(PENDING_CONNECTOR_COOKIE, connectorKey);
  } catch {
    // ignore
  }
}

export function clearPendingConnectorCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${PENDING_CONNECTOR_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  try {
    sessionStorage.removeItem(PENDING_CONNECTOR_COOKIE);
  } catch {
    // ignore
  }
}
