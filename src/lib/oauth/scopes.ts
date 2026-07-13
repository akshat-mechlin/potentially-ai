import type { ConnectorKey } from "@/lib/connectors/types";
import { getConnectorDefinition } from "@/lib/connectors/registry";

/**
 * Prefer the browser origin so local tunnel/localhost works.
 * Fall back to NEXT_PUBLIC_APP_URL on the server.
 */
export function getConnectRedirectUrl(connectorKey: ConnectorKey) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:1020");
  return `${origin.replace(/\/$/, "")}/api/auth/callback?next=/connectors&connector=${connectorKey}`;
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
  if (configured) urls.add(`${configured}/api/auth/callback`);
  urls.add("http://localhost:1020/api/auth/callback");
  if (typeof window !== "undefined") {
    urls.add(`${window.location.origin}/api/auth/callback`);
  }
  return [...urls];
}
