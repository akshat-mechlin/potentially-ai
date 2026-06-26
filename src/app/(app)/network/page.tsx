"use client";

import { useQuery } from "@tanstack/react-query";
import { NetworkGraph } from "@/components/network/network-graph";
import { Skeleton } from "@/components/ui/skeleton";
import type { GraphData } from "@/types";

export default function NetworkPage() {
  const { data, isLoading } = useQuery<GraphData>({
    queryKey: ["graph"],
    queryFn: () => fetch("/api/graph").then((r) => r.json()),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Network Graph</h1>
        <p className="text-muted-foreground">
          Visualize relationships, connections, and introduction paths
        </p>
      </div>
      {isLoading ? <Skeleton className="h-[560px]" /> : data ? <NetworkGraph data={data} /> : null}
    </div>
  );
}
