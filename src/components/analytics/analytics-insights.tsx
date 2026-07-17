"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb, TriangleAlert, CircleCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn } from "@/lib/utils";
import type { AnalyticsInsight } from "@/types";

interface AnalyticsInsightsProps {
  insights: AnalyticsInsight[];
}

const toneStyles = {
  positive: {
    icon: CircleCheck,
    wrap: "border-primary/20 bg-primary/5",
    iconWrap: "bg-primary/15 text-primary",
  },
  warning: {
    icon: TriangleAlert,
    wrap: "border-amber-500/25 bg-amber-500/5",
    iconWrap: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  neutral: {
    icon: Lightbulb,
    wrap: "border-border bg-card",
    iconWrap: "bg-secondary text-primary",
  },
} as const;

export function AnalyticsInsights({ insights }: AnalyticsInsightsProps) {
  const { isMobileApp } = useMobileApp();
  if (!insights.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-section-title">Insights</h2>
          <p className="text-sub text-muted-foreground">Suggested next moves from your activity</p>
        </div>
      </div>
      <div className={cn("grid gap-3", isMobileApp ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-4")}>
        {insights.map((insight) => {
          const tone = toneStyles[insight.tone];
          const Icon = tone.icon;
          return (
            <Card key={insight.id} className={cn("border", tone.wrap, isMobileApp && "mobile-card-flat shadow-none")}>
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tone.iconWrap)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-snug text-foreground">{insight.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
                <Link
                  href={insight.href}
                  className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {insight.cta}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
