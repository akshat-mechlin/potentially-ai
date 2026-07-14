"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cable, Search } from "lucide-react";
import { CsvImportButton } from "@/components/contacts/csv-import-button";
import { ConnectorCard } from "@/components/connectors/connector-card";
import { ConnectorSetupBanner } from "@/components/connectors/connector-setup-banner";
import { DesktopOnly, MobileKpiStrip, MobileSectionLabel } from "@/components/mobile/primitives";
import { useConnectorActions } from "@/hooks/use-connector-actions";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { connectConnector } from "@/lib/oauth/connect";
import {
  CONNECTOR_CATEGORY_LABELS,
  CONNECTOR_CATEGORY_ORDER,
  type ConnectorKey,
  type ConnectorState,
} from "@/lib/connectors/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type ConnectorsResponse = {
  connectors: ConnectorState[];
  stats: { total: number; connected: number; live: number; accounts: number };
  categories: Array<{ id: string; label: string; count: number }>;
};

export function ConnectorDashboard() {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { data, isLoading } = useQuery<ConnectorsResponse>({
    queryKey: ["connectors"],
    queryFn: () => fetch("/api/connectors").then((r) => r.json()),
    enabled: mounted,
  });

  const { busyAccountId, handleConnect, handleToggleAutoSync, invalidateConnectorQueries } =
    useConnectorActions(data?.connectors);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const connectError = searchParams.get("connect_error");
    const syncError = searchParams.get("sync_error");
    const reconnect = searchParams.get("reconnect") as ConnectorKey | null;

    if (!connected && !connectError && !syncError && !reconnect) return;

    if (connected) {
      queryClient.invalidateQueries({ queryKey: ["connectors"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    }
    if (connectError) {
      toast.error(decodeURIComponent(connectError));
    }
    if (syncError) {
      toast.error(`Connected, but sync failed: ${decodeURIComponent(syncError)}`);
    }

    const url = new URL(window.location.href);
    ["connected", "synced", "connect_error", "sync_error", "reconnect"].forEach((key) =>
      url.searchParams.delete(key),
    );
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);

    if (reconnect) {
      void (async () => {
        try {
          await connectConnector(reconnect);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to reconnect");
        }
      })();
    }
  }, [searchParams, data?.connectors, queryClient]);

  const filtered = useMemo(() => {
    const list = data?.connectors ?? [];
    return list.filter((c) => {
      const matchesCategory = activeCategory === "all" || c.category === activeCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.categoryLabel.toLowerCase().includes(q) ||
        c.accounts.some(
          (a) =>
            a.label.toLowerCase().includes(q) || (a.email?.toLowerCase().includes(q) ?? false),
        );
      return matchesCategory && matchesSearch;
    });
  }, [data?.connectors, activeCategory, search]);

  const grouped = useMemo(() => {
    if (activeCategory !== "all") {
      return [
        {
          id: activeCategory,
          label:
            CONNECTOR_CATEGORY_LABELS[
              activeCategory as keyof typeof CONNECTOR_CATEGORY_LABELS
            ],
          items: filtered,
        },
      ];
    }
    return CONNECTOR_CATEGORY_ORDER.map((id) => ({
      id,
      label: CONNECTOR_CATEGORY_LABELS[id],
      items: filtered.filter((c) => c.category === id),
    })).filter((g) => g.items.length > 0);
  }, [filtered, activeCategory]);

  const stats = data?.stats;

  return (
    <div className={isMobileApp ? "space-y-4 pb-2" : "space-y-8"}>
      <DesktopOnly>
        <p className="text-sub text-muted-foreground">
          Open a connector to manage accounts, sync, or disconnect. Use Auto-sync on a card to
          refresh records every 24 hours. Add multiple accounts per platform, or import CSV / Excel
          under Custom.
        </p>
      </DesktopOnly>

      {!isMobileApp && <ConnectorSetupBanner />}

      {stats && isMobileApp && (
        <MobileKpiStrip
          items={[
            { label: "Platforms", value: stats.total },
            { label: "Connected", value: stats.connected },
            { label: "Accounts", value: stats.accounts },
            { label: "Live", value: stats.live },
          ]}
        />
      )}

      {stats && !isMobileApp && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Platforms", value: stats.total },
            { label: "Connected platforms", value: stats.connected },
            { label: "Linked accounts", value: stats.accounts },
            { label: "Live integrations", value: stats.live },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <p className="text-kpi-label">{stat.label}</p>
                <p className="text-kpi-value mt-1">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div
        className={
          isMobileApp
            ? "space-y-3"
            : "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        }
      >
        <div className={`relative max-w-md ${isMobileApp ? "w-full" : "flex-1"}`}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search connectors..."
            className={isMobileApp ? "rounded-xl bg-card pl-9" : "pl-9"}
          />
        </div>
        <div className={isMobileApp ? "mobile-pill-nav !px-0" : "flex flex-wrap gap-2"}>
          {isMobileApp ? (
            <>
              <button
                type="button"
                data-active={activeCategory === "all"}
                className="mobile-pill-nav-item"
                onClick={() => setActiveCategory("all")}
              >
                All
              </button>
              {CONNECTOR_CATEGORY_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-active={activeCategory === id}
                  className="mobile-pill-nav-item"
                  onClick={() => setActiveCategory(id)}
                >
                  {CONNECTOR_CATEGORY_LABELS[id]}
                </button>
              ))}
            </>
          ) : (
            <>
              <Button
                variant={activeCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory("all")}
              >
                All
              </Button>
              {CONNECTOR_CATEGORY_ORDER.map((id) => (
                <Button
                  key={id}
                  variant={activeCategory === id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(id)}
                >
                  {CONNECTOR_CATEGORY_LABELS[id]}
                </Button>
              ))}
            </>
          )}
        </div>
      </div>

      {!mounted || isLoading ? (
        <div className={isMobileApp ? "space-y-2" : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
          {Array.from({ length: isMobileApp ? 4 : 6 }).map((_, i) => (
            <Skeleton key={i} className={isMobileApp ? "h-20 rounded-xl" : "h-56 rounded-2xl"} />
          ))}
        </div>
      ) : (
        <div className={isMobileApp ? "space-y-4" : "space-y-10"}>
          {grouped.map((group) => (
            <section key={group.id} className="space-y-2">
              {isMobileApp ? (
                <MobileSectionLabel>
                  {group.label} · {group.items.length}
                </MobileSectionLabel>
              ) : (
                <div className="flex items-center gap-2">
                  <Cable className="h-4 w-4 text-primary" />
                  <h2 className="text-section-title">{group.label}</h2>
                  <span className="text-xs text-muted-foreground">({group.items.length})</span>
                </div>
              )}
              <div
                className={
                  isMobileApp ? "space-y-2" : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                }
              >
                {group.items.map((connector) => (
                  <ConnectorCard
                    key={connector.key}
                    connector={connector}
                    busyAccountId={busyAccountId}
                    onConnect={handleConnect}
                    onToggleAutoSync={handleToggleAutoSync}
                    importSlot={
                      connector.key === "custom_data" ? (
                        <CsvImportButton
                          variant="outline"
                          size="sm"
                          label="Import"
                          onImported={invalidateConnectorQueries}
                        />
                      ) : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
