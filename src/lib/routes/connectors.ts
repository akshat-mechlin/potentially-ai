import type { ConnectorKey } from "@/lib/connectors/types";

export function connectorHref(key: ConnectorKey) {
  return `/connectors/${key}`;
}

export function connectorAccountHref(key: ConnectorKey, accountId: string) {
  return `/connectors/${key}/accounts/${accountId}`;
}
