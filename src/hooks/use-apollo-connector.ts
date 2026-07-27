"use client";

import { useQuery } from "@tanstack/react-query";
import { useIsClient } from "@/hooks/use-is-client";
import type { ConnectorState } from "@/lib/connectors/types";
import { connectorHref } from "@/lib/routes/connectors";

type ConnectorsResponse = {
  connectors: ConnectorState[];
};

export function useApolloConnector() {
  const mounted = useIsClient();
  const { data, isLoading } = useQuery<ConnectorsResponse>({
    queryKey: ["connectors"],
    queryFn: () => fetch("/api/connectors").then((r) => r.json()),
    enabled: mounted,
  });

  const connector = data?.connectors.find((item) => item.key === "apollo") ?? null;
  const account = connector?.accounts[0] ?? null;

  return {
    isLoading,
    connected: Boolean(connector?.connected),
    accountLabel: account?.label ?? null,
    connectHref: connectorHref("apollo"),
    connector,
  };
}
