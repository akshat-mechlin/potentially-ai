"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectConnector } from "@/lib/oauth/connect";
import type { ConnectorKey, ConnectorState } from "@/lib/connectors/types";
import { toast } from "sonner";

export function useConnectorActions(connectors?: ConnectorState[]) {
  const queryClient = useQueryClient();
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);

  const invalidateConnectorQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["connectors"] });
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    queryClient.invalidateQueries({ queryKey: ["connector-records"] });
    queryClient.invalidateQueries({ queryKey: ["graph"] });
  };

  const handleConnect = async (key: ConnectorKey) => {
    setBusyAccountId("connect");
    try {
      const result = await connectConnector(key);
      if (result.demo) {
        invalidateConnectorQueries();
        setBusyAccountId(null);
      }
      // Real OAuth navigates away; keep busy until then.
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect account");
      setBusyAccountId(null);
    }
  };

  const handleSync = async (key: ConnectorKey, accountId?: string) => {
    setBusyAccountId(accountId ?? "all");
    try {
      const res = await fetch("/api/connectors/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connector_key: key, account_id: accountId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed");
      invalidateConnectorQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setBusyAccountId(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    const isCsvImport =
      connectors
        ?.find((c) => c.key === "custom_data")
        ?.accounts.some((a) => a.id === accountId) ?? false;

    setBusyAccountId(accountId);
    try {
      const res = await fetch(`/api/connectors?id=${accountId}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Disconnect failed");
      queryClient.invalidateQueries({ queryKey: ["connectors"] });
      queryClient.invalidateQueries({ queryKey: ["connector-records"] });
      if (isCsvImport) {
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        queryClient.invalidateQueries({ queryKey: ["graph"] });
      }
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Disconnect failed");
      return false;
    } finally {
      setBusyAccountId(null);
    }
  };

  const handleToggleAutoSync = async (key: ConnectorKey, enabled: boolean) => {
    setBusyAccountId(`auto-sync:${key}`);
    try {
      const res = await fetch("/api/connectors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connector_key: key, enabled }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update auto-sync");
      invalidateConnectorQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update auto-sync");
    } finally {
      setBusyAccountId(null);
    }
  };

  return {
    busyAccountId,
    handleConnect,
    handleSync,
    handleDisconnect,
    handleToggleAutoSync,
    invalidateConnectorQueries,
  };
}
