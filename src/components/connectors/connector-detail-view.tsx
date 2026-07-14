"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Unplug,
} from "lucide-react";
import { CsvImportButton } from "@/components/contacts/csv-import-button";
import { ConnectorRecordsPanel } from "@/components/connectors/connector-records-panel";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import type { ConnectorKey, ConnectorState } from "@/lib/connectors/types";
import { useConnectorActions } from "@/hooks/use-connector-actions";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { useIsClient } from "@/hooks/use-is-client";
import { connectorAccountHref, connectorHref } from "@/lib/routes/connectors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectorAvailabilityBadge, ConnectorBrandIcon } from "./connector-ui";

type ConnectorsResponse = {
  connectors: ConnectorState[];
};

interface ConnectorDetailViewProps {
  connectorKey: string;
  accountId?: string;
}

export function ConnectorDetailView({ connectorKey, accountId }: ConnectorDetailViewProps) {
  const mounted = useIsClient();
  const router = useRouter();
  const { data, isLoading } = useQuery<ConnectorsResponse>({
    queryKey: ["connectors"],
    queryFn: () => fetch("/api/connectors").then((r) => r.json()),
    enabled: mounted,
  });

  const {
    busyAccountId,
    handleConnect,
    handleSync,
    handleDisconnect,
    invalidateConnectorQueries,
  } = useConnectorActions(data?.connectors);
  const { confirm, confirmDialog } = useConfirmDialog();

  const connector = data?.connectors.find((item) => item.key === connectorKey) ?? null;
  const key = connector?.key as ConnectorKey | undefined;
  const isCustom = key === "custom_data";
  const def = key ? getConnectorDefinition(key) : null;
  const syncSource = def?.syncSource;
  const selectedAccount =
    connector && accountId
      ? (connector.accounts.find((account) => account.id === accountId) ?? null)
      : null;

  const requestDisconnect = async (account: { id: string; label: string }) => {
    const confirmed = await confirm(
      isCustom
        ? {
            title: "Remove this import?",
            description:
              account.id === "csv-aggregate"
                ? "This removes all CSV-imported contacts from your network. This cannot be undone."
                : `This removes “${account.label}” and deletes its imported contacts from your network. This cannot be undone.`,
            confirmLabel: "Remove import",
          }
        : {
            title: "Disconnect this account?",
            description: `Disconnect “${account.label}” from ${connector?.name ?? "this connector"}? Synced contacts stay in your network unless you exclude or delete them.`,
            confirmLabel: "Disconnect",
          },
    );
    if (!confirmed) return false;
    return handleDisconnect(account.id);
  };

  if (!mounted || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full max-w-xl" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!connector || !key) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/connectors">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to connectors
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Connector not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accountId && !selectedAccount) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={connectorHref(key)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to {connector.name}
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Account not found. It may have been disconnected.
          </CardContent>
        </Card>
      </div>
    );
  }

  const showAddAccount =
    connector.canConnect && (connector.supportsMultipleAccounts || !connector.connected);

  const importSlot = isCustom ? (
    <CsvImportButton
      variant="outline"
      size="sm"
      label="Import"
      onImported={invalidateConnectorQueries}
    />
  ) : null;

  const backHref = selectedAccount ? connectorHref(key) : "/connectors";
  const backLabel = selectedAccount ? `Back to ${connector.name}` : "Back to connectors";
  const title = selectedAccount ? selectedAccount.label : connector.name;
  const subtitle = selectedAccount
    ? `${selectedAccount.recordsCount.toLocaleString()} records · synced ${selectedAccount.lastSync}`
    : connector.description;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {!selectedAccount && <ConnectorBrandIcon connector={connector} />}
            <div className="min-w-0 space-y-1">
              <h1 className="text-page-title break-all text-xl sm:text-2xl">{title}</h1>
              <p className="text-sub text-sm text-muted-foreground">{subtitle}</p>
              {!selectedAccount && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <ConnectorAvailabilityBadge
                    availability={connector.availability}
                    connected={connector.connected}
                  />
                  {connector.connected && (
                    <span className="text-xs text-muted-foreground">
                      {connector.accountCount} account
                      {connector.accountCount === 1 ? "" : "s"} ·{" "}
                      {connector.recordsCount.toLocaleString()} records
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {isCustom ? (
              importSlot
            ) : showAddAccount ? (
              <Button
                size="sm"
                variant={connector.connected ? "outline" : "default"}
                onClick={() => handleConnect(key)}
                disabled={Boolean(busyAccountId)}
              >
                {connector.connected ? (
                  <>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add account
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            ) : null}

            {connector.connected && connector.canSync && !selectedAccount && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSync(key)}
                disabled={Boolean(busyAccountId)}
              >
                {busyAccountId === "all" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    Sync all
                  </>
                )}
              </Button>
            )}

            {selectedAccount && (
              <>
                {connector.canSync && !isCustom && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSync(key, selectedAccount.id)}
                    disabled={Boolean(busyAccountId)}
                  >
                    {busyAccountId === selectedAccount.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        Sync
                      </>
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    const ok = await requestDisconnect(selectedAccount);
                    if (ok) router.push(connectorHref(key));
                  }}
                  disabled={Boolean(busyAccountId)}
                >
                  {isCustom ? (
                    <>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Remove import
                    </>
                  ) : (
                    <>
                      <Unplug className="mr-1 h-3.5 w-3.5" />
                      Disconnect
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {!selectedAccount ? (
        connector.accounts.length === 0 ? (
          <Card className="border-border/80">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              {connector.availability === "coming_soon"
                ? "This connector is coming soon."
                : "No accounts connected yet. Use Connect to get started."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {connector.accounts.map((account) => {
              const busy = busyAccountId === account.id || busyAccountId === "all";
              return (
                <Card
                  key={account.id}
                  className="border-border/80 transition-shadow hover:border-primary/30 hover:shadow-md"
                >
                  <CardContent className="flex items-stretch gap-1 p-0">
                    <Link
                      href={connectorAccountHref(key, account.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{account.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {account.recordsCount.toLocaleString()} records · {account.lastSync}
                        </p>
                      </div>
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                    <div className="flex shrink-0 items-center gap-0.5 border-l border-border/60 px-2">
                      {connector.canSync && !isCustom && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Sync this account"
                          disabled={busy}
                          onClick={() => handleSync(key, account.id)}
                        >
                          {busyAccountId === account.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title={isCustom ? "Remove import" : "Disconnect"}
                        disabled={busy}
                            onClick={() => void requestDisconnect(account)}
                      >
                        {isCustom ? (
                          <Trash2 className="h-3.5 w-3.5" />
                        ) : (
                          <Unplug className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <ConnectorRecordsPanel
          connectorKey={key}
          accountId={selectedAccount.id}
          syncSource={syncSource}
          isCustom={isCustom}
          importBatchId={selectedAccount.importBatchId}
        />
      )}

      {confirmDialog}
    </div>
  );
}
