import type { ConnectorKey } from "@/lib/connectors/types";
import { getConnectorDefinition } from "@/lib/connectors/registry";

export function getConnectRedirectUrl(connectorKey: ConnectorKey) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL;
  return `${origin}/api/auth/callback?next=/connectors&connector=${connectorKey}`;
}

export function getOAuthConfig(connectorKey: ConnectorKey) {
  const def = getConnectorDefinition(connectorKey);
  if (!def?.oauth) return null;
  return def.oauth;
}

export function isOAuthConnector(connectorKey: ConnectorKey) {
  return Boolean(getConnectorDefinition(connectorKey)?.oauth);
}
