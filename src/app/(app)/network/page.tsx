"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { NetworkGraph } from "@/components/network/network-graph";
import { MobileEmpty, MobileMenuItem, MobileMenuList } from "@/components/mobile/primitives";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { useGraphViewEnabled } from "@/hooks/use-feature-flags";
import { FeatureDisabled } from "@/components/shared/feature-disabled";
import { Skeleton } from "@/components/ui/skeleton";
import { contactHref } from "@/lib/routes/contacts";
import type { GraphData } from "@/types";

export default function NetworkPage() {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const { enabled: graphEnabled, loading: flagLoading } = useGraphViewEnabled();

  const { data, isLoading } = useQuery<GraphData>({
    queryKey: ["graph"],
    queryFn: () => fetch("/api/graph").then((r) => r.json()),
    enabled: mounted && graphEnabled,
  });

  if (flagLoading) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }

  if (!graphEnabled) {
    return <FeatureDisabled title="Network graph" flag="graph_view" />;
  }

  const contactNodes = (data?.nodes ?? []).filter((n) => n.type === "contact").slice(0, 50);

  if (isMobileApp) {
    return (
      <div className="space-y-3 pb-2">
        {!mounted || isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : contactNodes.length ? (
          <MobileMenuList>
            {contactNodes.map((node) => (
              <MobileMenuItem
                key={node.id}
                href={contactHref(node.id)}
                label={node.name}
                iconMuted
              />
            ))}
          </MobileMenuList>
        ) : (
          <MobileEmpty>No network connections yet</MobileEmpty>
        )}
        <p className="text-center text-[11px] text-muted-foreground">
          <Link href="/connectors" className="text-primary">
            Connect accounts
          </Link>{" "}
          to build your graph
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sub text-muted-foreground" suppressHydrationWarning>
        Visualize relationships, connections, and introduction paths
      </p>
      {!mounted || isLoading ? (
        <Skeleton className="h-[560px]" />
      ) : data ? (
        <NetworkGraph data={data} />
      ) : null}
    </div>
  );
}
