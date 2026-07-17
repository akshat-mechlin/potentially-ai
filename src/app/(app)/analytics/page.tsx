"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "@/types";

export default function AnalyticsPage() {
  const { isMobileApp } = useMobileApp();
  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
  });

  return (
    <div className={cn("space-y-4", isMobileApp ? "pb-4" : "lg:space-y-6")}>
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">Could not load analytics</p>
          <p className="mt-1 text-xs text-muted-foreground">Refresh the page and try again.</p>
        </div>
      ) : data ? (
        <AnalyticsDashboard data={data} />
      ) : null}
    </div>
  );
}
