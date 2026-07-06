"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { DesktopOnly } from "@/components/mobile/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsData } from "@/types";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: () => fetch("/api/analytics").then((r) => r.json()),
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <DesktopOnly>
        <p className="text-sub text-muted-foreground">
          Track searches, engagement, and network growth across all your groups
        </p>
      </DesktopOnly>
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl lg:h-80" />
          ))}
        </div>
      ) : data ? (
        <AnalyticsCharts data={data} />
      ) : null}
    </div>
  );
}
