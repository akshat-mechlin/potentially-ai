"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { contactHref } from "@/lib/routes/contacts";
import { cn, getInitials } from "@/lib/utils";
import type { AnalyticsData } from "@/types";

interface AnalyticsChartsProps {
  data: AnalyticsData;
}

type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

function ChartTooltip({
  active,
  payload,
  label,
  valueLabel,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  valueLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      {label && <p className="text-[11px] text-muted-foreground">{label}</p>}
      <p className="text-sm font-medium">
        {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
        {valueLabel ? ` ${valueLabel}` : ""}
      </p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const { isMobileApp } = useMobileApp();
  const chartHeight = isMobileApp ? 200 : 260;
  const cardClass = isMobileApp ? "mobile-card-flat border-0 shadow-none" : "";

  const searchTotal = data.searches_per_day.reduce((sum, d) => sum + d.count, 0);
  const growthHasData = data.workspace_growth.some((d) => d.contacts > 0);
  const strengthTotal = data.strength_distribution.reduce((sum, d) => sum + d.count, 0);
  const funnelMax = Math.max(...data.outreach_funnel.map((s) => s.count), 1);
  const engagementMax = Math.max(...data.engagement.map((e) => e.count), 1);
  const introTotal = data.intro_pipeline.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className={cn("grid gap-4", isMobileApp ? "grid-cols-1" : "gap-6 lg:grid-cols-2")}>
        <Card className={cardClass}>
          <CardHeader className={isMobileApp ? "px-4 pb-2 pt-4" : undefined}>
            <CardTitle className="text-base">Search activity</CardTitle>
            <CardDescription>Last 14 days · {searchTotal.toLocaleString()} searches</CardDescription>
          </CardHeader>
          <CardContent className={isMobileApp ? "px-2 pb-4" : undefined}>
            {searchTotal === 0 ? (
              <EmptyChart message="No searches yet. Try finding people in your network." />
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={data.searches_per_day}>
                  <defs>
                    <linearGradient id="searchFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={28}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip valueLabel="searches" />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill="url(#searchFill)"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className={isMobileApp ? "px-4 pb-2 pt-4" : undefined}>
            <CardTitle className="text-base">Network growth</CardTitle>
            <CardDescription>Contacts added over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className={isMobileApp ? "px-2 pb-4" : undefined}>
            {!growthHasData ? (
              <EmptyChart message="Connect a source or import contacts to see growth." />
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={data.workspace_growth}>
                  <defs>
                    <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={36}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip valueLabel="contacts" />} />
                  <Area
                    type="monotone"
                    dataKey="contacts"
                    stroke="var(--chart-2)"
                    strokeWidth={2.5}
                    fill="url(#growthFill)"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={cn("grid gap-4", isMobileApp ? "grid-cols-1" : "gap-6 lg:grid-cols-3")}>
        <Card className={cn(cardClass, !isMobileApp && "lg:col-span-1")}>
          <CardHeader className={isMobileApp ? "px-4 pb-2 pt-4" : undefined}>
            <CardTitle className="text-base">Relationship strength</CardTitle>
            <CardDescription>How warm your network is overall</CardDescription>
          </CardHeader>
          <CardContent className={isMobileApp ? "px-4 pb-4" : undefined}>
            {strengthTotal === 0 ? (
              <EmptyChart message="No contacts to score yet." />
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div className="relative h-[180px] w-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.strength_distribution}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {data.strength_distribution.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueLabel="contacts" />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="font-display text-2xl text-foreground">{strengthTotal}</p>
                    <p className="text-[10px] text-muted-foreground">contacts</p>
                  </div>
                </div>
                <ul className="w-full space-y-2.5">
                  {data.strength_distribution.map((bucket) => {
                    const share = Math.round((bucket.count / strengthTotal) * 100);
                    return (
                      <li key={bucket.key} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: bucket.color }}
                          />
                          {bucket.label}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {bucket.count} · {share}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(cardClass, !isMobileApp && "lg:col-span-2")}>
          <CardHeader className={isMobileApp ? "px-4 pb-2 pt-4" : undefined}>
            <CardTitle className="text-base">Outreach funnel</CardTitle>
            <CardDescription>Playbook prospects from match to booked meeting</CardDescription>
          </CardHeader>
          <CardContent className={cn("space-y-4", isMobileApp ? "px-4 pb-4" : undefined)}>
            {funnelMax <= 1 && data.outreach_funnel.every((s) => s.count === 0) ? (
              <EmptyChart message="Run a playbook to see conversion through the funnel." />
            ) : (
              data.outreach_funnel.map((stage, index) => {
                const prev = index === 0 ? stage.count : data.outreach_funnel[index - 1].count;
                const conversion = prev > 0 ? Math.round((stage.count / prev) * 100) : null;
                return (
                  <div key={stage.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{stage.stage}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {stage.count.toLocaleString()}
                        {conversion !== null && index > 0 ? ` · ${conversion}% of prior` : ""}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--chart-1)] to-[var(--chart-2)] transition-all"
                        style={{ width: `${Math.max(4, (stage.count / funnelMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className={cn("grid gap-4", isMobileApp ? "grid-cols-1" : "gap-6 lg:grid-cols-2")}>
        <Card className={cardClass}>
          <CardHeader className={isMobileApp ? "px-4 pb-2 pt-4" : undefined}>
            <CardTitle className="text-base">Engagement mix</CardTitle>
            <CardDescription>Touchpoints logged across your groups</CardDescription>
          </CardHeader>
          <CardContent className={isMobileApp ? "px-2 pb-4" : undefined}>
            {data.engagement.length === 0 ? (
              <EmptyChart message="Log emails, meetings, or LinkedIn touches to populate this." />
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={data.engagement} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="type"
                    type="category"
                    width={isMobileApp ? 64 : 72}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="var(--chart-1)" maxBarSize={28}>
                    {data.engagement.map((entry) => (
                      <Cell
                        key={entry.type}
                        fillOpacity={0.55 + (entry.count / engagementMax) * 0.45}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className={isMobileApp ? "px-4 pb-2 pt-4" : undefined}>
            <CardTitle className="text-base">Introduction pipeline</CardTitle>
            <CardDescription>
              {introTotal.toLocaleString()} intro{introTotal === 1 ? "" : "s"} total
            </CardDescription>
          </CardHeader>
          <CardContent className={cn("space-y-3", isMobileApp ? "px-4 pb-4" : undefined)}>
            {introTotal === 0 ? (
              <EmptyChart message="Request an introduction to start tracking the pipeline." />
            ) : (
              data.intro_pipeline.map((row) => {
                const share = Math.round((row.count / introTotal) * 100);
                return (
                  <div key={row.status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{row.status}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {row.count} · {share}%
                      </span>
                    </div>
                    <Progress value={share} className="h-2" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cardClass}>
        <CardHeader className={isMobileApp ? "px-4 pb-2 pt-4" : undefined}>
          <CardTitle className="text-base">Strongest relationships</CardTitle>
          <CardDescription>Highest strength scores in your network</CardDescription>
        </CardHeader>
        <CardContent className={isMobileApp ? "px-4 pb-4" : undefined}>
          {data.top_contacts.length === 0 ? (
            <EmptyChart message="Add contacts to see your strongest ties." />
          ) : (
            <ul className="divide-y divide-border">
              {data.top_contacts.map((contact, index) => (
                <li key={contact.id}>
                  <Link
                    href={contactHref(contact.id)}
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                      {index + 1}
                    </span>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(contact.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{contact.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {contact.company ?? "No company"}
                      </p>
                    </div>
                    <div className="w-24 shrink-0 space-y-1 text-right">
                      <p className="text-sm font-semibold tabular-nums text-primary">{contact.strength}%</p>
                      <Progress value={contact.strength} className="h-1.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
