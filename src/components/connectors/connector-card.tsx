"use client";

import { CheckCircle, Link2, Loader2, Plus, RefreshCw, Trash2, Unplug } from "lucide-react";
import type { ConnectorAccount, ConnectorState } from "@/lib/connectors/types";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ConnectorAvailabilityBadge,
  ConnectorBrandIcon,
  ConnectorCapabilityTags,
} from "./connector-ui";

interface ConnectorCardProps {
  connector: ConnectorState;
  busyAccountId: string | null;
  onConnect: (key: ConnectorState["key"]) => void;
  onSync: (key: ConnectorState["key"], accountId?: string) => void;
  onDisconnect: (accountId: string) => void;
  importSlot?: React.ReactNode;
}

function AccountRow({
  account,
  busy,
  canSync,
  onSync,
  onDisconnect,
  removeLabel = "Disconnect",
  removeIcon = "unplug",
}: {
  account: ConnectorAccount;
  busy: boolean;
  canSync: boolean;
  onSync: () => void;
  onDisconnect: () => void;
  removeLabel?: string;
  removeIcon?: "unplug" | "trash";
}) {
  const RemoveIcon = removeIcon === "trash" ? Trash2 : Unplug;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{account.label}</p>
        <p className="text-xs text-muted-foreground">
          {account.recordsCount.toLocaleString()} records · {account.lastSync}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDisconnect}
          disabled={busy}
          aria-label={removeLabel}
          title={removeLabel}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RemoveIcon className="h-3.5 w-3.5" />
          )}
        </Button>
        {canSync && (
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onSync} disabled={busy}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        <CheckCircle className="h-4 w-4 text-green-600" />
      </div>
    </div>
  );
}

export function ConnectorCard({
  connector,
  busyAccountId,
  onConnect,
  onSync,
  onDisconnect,
  importSlot,
}: ConnectorCardProps) {
  const isCustom = connector.key === "custom_data";
  const showAddAccount = connector.canConnect && connector.supportsMultipleAccounts;
  const { isMobileApp } = useMobileApp();

  if (isMobileApp) {
    return (
      <div className="mobile-card-flat overflow-hidden p-4">
        <div className="flex items-start gap-3">
          <ConnectorBrandIcon connector={connector} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{connector.name}</h3>
              <ConnectorAvailabilityBadge
                availability={connector.availability}
                connected={connector.connected}
              />
            </div>
            {connector.connected && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {connector.accountCount} account{connector.accountCount === 1 ? "" : "s"} ·{" "}
                {connector.recordsCount.toLocaleString()} records
              </p>
            )}
          </div>
        </div>

        {connector.accounts.length > 0 && !isCustom && (
          <div className="mt-3 space-y-2">
            {connector.accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                busy={busyAccountId === account.id}
                canSync={connector.canSync}
                onSync={() => onSync(connector.key, account.id)}
                onDisconnect={() => onDisconnect(account.id)}
              />
            ))}
          </div>
        )}

        {isCustom && connector.accounts.length > 0 && (
          <div className="mt-3 space-y-2">
            {connector.accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                busy={busyAccountId === account.id}
                canSync={false}
                onSync={() => undefined}
                onDisconnect={() => onDisconnect(account.id)}
                removeLabel="Remove CSV import"
                removeIcon="trash"
              />
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {isCustom ? (
            importSlot
          ) : showAddAccount || !connector.connected ? (
            <Button
              size="sm"
              variant={connector.connected ? "outline" : "default"}
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => onConnect(connector.key)}
              disabled={Boolean(busyAccountId) && !connector.connected}
            >
              {connector.connected ? (
                <>
                  <Plus className="mr-1 h-3 w-3" />
                  Add account
                </>
              ) : (
                <>
                  <Link2 className="mr-1 h-3 w-3" />
                  Connect
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-border/80 transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <ConnectorBrandIcon connector={connector} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-section-title text-base">{connector.name}</h3>
              <ConnectorAvailabilityBadge
                availability={connector.availability}
                connected={connector.connected}
              />
              {connector.accountCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {connector.accountCount} account{connector.accountCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-sub text-sm text-muted-foreground">{connector.description}</p>
            <ConnectorCapabilityTags capabilities={connector.capabilities} />
            {connector.connected && (
              <p className="text-xs text-muted-foreground">
                {connector.recordsCount.toLocaleString()} total records
              </p>
            )}
          </div>
        </div>

        {connector.accounts.length > 0 && !isCustom && (
          <div className="mt-4 space-y-2">
            {connector.accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                busy={busyAccountId === account.id}
                canSync={connector.canSync}
                onSync={() => onSync(connector.key, account.id)}
                onDisconnect={() => onDisconnect(account.id)}
              />
            ))}
          </div>
        )}

        {isCustom && connector.accounts.length > 0 && (
          <div className="mt-4 space-y-2">
            {connector.accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                busy={busyAccountId === account.id}
                canSync={false}
                onSync={() => undefined}
                onDisconnect={() => onDisconnect(account.id)}
                removeLabel="Remove CSV import"
                removeIcon="trash"
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
          {isCustom ? (
            importSlot
          ) : showAddAccount || !connector.connected ? (
            <Button
              size="sm"
              variant={connector.connected ? "outline" : "default"}
              onClick={() => onConnect(connector.key)}
              disabled={Boolean(busyAccountId) && !connector.connected}
            >
              {connector.connected ? (
                <>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add account
                </>
              ) : (
                <>
                  <Link2 className="mr-1 h-3.5 w-3.5" />
                  Connect
                </>
              )}
            </Button>
          ) : null}

          {connector.connected && connector.canSync && connector.accounts.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSync(connector.key)}
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
        </div>
      </CardContent>
    </Card>
  );
}
