"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  Handshake,
  Minus,
  Percent,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { AnalyticsInsights } from "@/components/analytics/analytics-insights";
import { MobileLargeTitle } from "@/components/mobile/native-ui";
import { Card, CardContent } from "@/components/ui/card";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "@/types";

interface AnalyticsDashboardProps {
  data: AnalyticsData;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" />
        vs prior
      </span>
    );
  }
  const up = value > 0;
  const flat = value === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium",
        flat && "text-muted-foreground",
        up && "text-primary",
        !up && !flat && "text-destructive",
      )}
    >
      {flat ? (
        <Minus className="h-3 w-3" />
      ) : up ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {up ? "+" : ""}
      {value}%
    </span>
  );
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const { isMobileApp } = useMobileApp();
  const { summary } = data;

  const kpis = [
    {
      label: "Network size",
      value: summary.contacts.toLocaleString(),
      delta: summary.contacts_delta,
      icon: Users,
      hint: "Total contacts across groups",
    },
    {
      label: "Searches (7d)",
      value: summary.searches_7d.toLocaleString(),
      delta: summary.searches_delta,
      icon: Search,
      hint: "AI and network searches this week",
    },
    {
      label: "Avg strength",
      value: `${summary.avg_strength}%`,
      delta: null,
      icon: Sparkles,
      hint: "Mean relationship strength score",
    },
    {
      label: "Open intros",
      value: summary.pending_intros.toLocaleString(),
      delta: null,
      icon: Handshake,
      hint: "Draft, requested, or accepted",
    },
    {
      label: "Reply rate",
      value: summary.reply_rate === null ? "—" : `${summary.reply_rate}%`,
      delta: null,
      icon: Percent,
      hint: "Replies ÷ outreach sent",
    },
    {
      label: "Meetings booked",
      value: summary.booked.toLocaleString(),
      delta: null,
      icon: CalendarCheck2,
      hint: "Playbook prospects marked booked",
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {isMobileApp ? (
        <MobileLargeTitle title="Analytics" subtitle="What is working in your network" />
      ) : (
        <div>
          <h1 className="font-display text-2xl text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Searches, relationship health, outreach funnel, and what to do next
          </p>
        </div>
      )}

      <div
        className={cn(
          "grid gap-3",
          isMobileApp ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        )}
      >
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className={cn(
              "overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-secondary/30",
              isMobileApp && "mobile-card-flat border-0 shadow-none",
            )}
          >
            <CardContent className={cn("space-y-2", isMobileApp ? "p-3.5" : "p-4")}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-kpi-label truncate">{kpi.label}</p>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <kpi.icon className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <p className={cn("font-display tracking-tight text-foreground", isMobileApp ? "text-2xl" : "text-3xl")}>
                {kpi.value}
              </p>
              <div className="flex items-center justify-between gap-2">
                <DeltaBadge value={kpi.delta} />
                {!isMobileApp && (
                  <span className="truncate text-[10px] text-muted-foreground">{kpi.hint}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.stale_contacts > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {summary.stale_contacts.toLocaleString()} contacts need attention
            </p>
            <p className="text-xs text-muted-foreground">
              No logged interaction in 90+ days. Re-engage or clean up.
            </p>
          </div>
          <Link
            href="/contacts"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Review contacts
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <AnalyticsInsights insights={data.insights} />
      <AnalyticsCharts data={data} />
    </div>
  );
}
