"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsData } from "@/types";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: () => fetch("/api/analytics").then((r) => r.json()),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Track searches, engagement, and workspace growth
        </p>
      </div>
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : data ? (
        <AnalyticsCharts data={data} />
      ) : null}
    </div>
  );
}
