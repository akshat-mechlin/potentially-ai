import { isDemoMode } from "@/lib/demo-data";
import type { ConnectorKey } from "@/lib/connectors/types";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { getOAuthConfig } from "@/lib/oauth/scopes";
import { supportsDirectConnectorOAuth } from "@/lib/oauth/connector-oauth";

/**
 * Start OAuth for a connector.
 *
 * Google / Microsoft use app-owned OAuth (not Supabase linkIdentity) so the same
 * provider mailbox can be connected even when that identity already belongs to
 * another Potentially auth user. Tokens are stored only on data_connectors.
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

  if (!supportsDirectConnectorOAuth(connectorKey)) {
    throw new Error(
      `${def.name} connection via this provider is not supported yet.`,
    );
  }

  window.location.assign(
    `/api/connectors/oauth/start?connector=${encodeURIComponent(connectorKey)}`,
  );
  return { redirecting: true as const };
}
