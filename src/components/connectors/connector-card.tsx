"use client";

import Link from "next/link";
import { ChevronRight, Link2 } from "lucide-react";
import type { ConnectorState } from "@/lib/connectors/types";
import { connectorHref } from "@/lib/routes/connectors";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ConnectorAvailabilityBadge,
  ConnectorBrandIcon,
  ConnectorCapabilityTags,
} from "./connector-ui";

interface ConnectorCardProps {
  connector: ConnectorState;
  busyAccountId: string | null;
  onConnect: (key: ConnectorState["key"]) => void;
  onToggleAutoSync?: (key: ConnectorState["key"], enabled: boolean) => void;
  importSlot?: React.ReactNode;
}

export function ConnectorCard({
  connector,
  busyAccountId,
  onConnect,
  onToggleAutoSync,
  importSlot,
}: ConnectorCardProps) {
  const isCustom = connector.key === "custom_data";
  const showConnect = connector.canConnect && !connector.connected;
  const href = connectorHref(connector.key);
  const { isMobileApp } = useMobileApp();
  const showFooter = isCustom || showConnect;
  const autoSyncBusy = busyAccountId === `auto-sync:${connector.key}`;
  const showAutoSync = connector.canSync && Boolean(onToggleAutoSync);

  const summary =
    connector.connected || (isCustom && connector.accounts.length > 0) ? (
      <p className="text-xs text-muted-foreground">
        {connector.accountCount} account{connector.accountCount === 1 ? "" : "s"} ·{" "}
        {connector.recordsCount.toLocaleString()} records
      </p>
    ) : null;

  const autoSyncControl = showAutoSync ? (
    <label
      className="flex shrink-0 items-center gap-2"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <span className="text-[11px] font-medium text-muted-foreground">Auto-sync</span>
      <Switch
        checked={connector.autoSyncEnabled}
        disabled={autoSyncBusy || Boolean(busyAccountId)}
        onCheckedChange={(checked) => onToggleAutoSync?.(connector.key, checked)}
        aria-label={`Auto-sync ${connector.name} every 24 hours`}
        title="Refresh records every 24 hours"
      />
    </label>
  ) : null;

  if (isMobileApp) {
    return (
      <div className="mobile-card-flat w-full overflow-hidden p-4">
        <div className="flex items-start gap-3">
          <Link href={href} className="flex min-w-0 flex-1 items-start gap-3 text-left">
            <ConnectorBrandIcon connector={connector} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{connector.name}</h3>
                <ConnectorAvailabilityBadge
                  availability={connector.availability}
                  connected={connector.connected}
                />
              </div>
              {summary}
            </div>
          </Link>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {autoSyncControl}
            <Link href={href} aria-label={`Open ${connector.name}`}>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-border/80 transition-shadow hover:border-primary/30 hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-5">
          <Link href={href} className="flex min-w-0 flex-1 items-start gap-4 text-left">
            <ConnectorBrandIcon connector={connector} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-section-title text-base">{connector.name}</h3>
                <ConnectorAvailabilityBadge
                  availability={connector.availability}
                  connected={connector.connected}
                />
              </div>
              <p className="text-sub text-sm text-muted-foreground">{connector.description}</p>
              <ConnectorCapabilityTags capabilities={connector.capabilities} />
              {summary}
            </div>
          </Link>
          <div className="flex shrink-0 flex-col items-end gap-3 pt-0.5">
            {autoSyncControl}
            <Link
              href={href}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Open ${connector.name}`}
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {showFooter && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
            {isCustom ? (
              importSlot
            ) : (
              <Button
                size="sm"
                onClick={() => onConnect(connector.key)}
                disabled={Boolean(busyAccountId)}
              >
                <Link2 className="mr-1 h-3.5 w-3.5" />
                Connect
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
