"use client";

import { useQuery } from "@tanstack/react-query";
import { NetworkGraph } from "@/components/network/network-graph";
import { useIsClient } from "@/hooks/use-is-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { GraphData } from "@/types";

export default function NetworkPage() {
  const mounted = useIsClient();

  const { data, isLoading } = useQuery<GraphData>({
    queryKey: ["graph"],
    queryFn: () => fetch("/api/graph").then((r) => r.json()),
    enabled: mounted,
  });

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
