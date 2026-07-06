"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "@/types";

interface AnalyticsChartsProps {
  data: AnalyticsData;
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const { isMobileApp } = useMobileApp();
  const cardClass = isMobileApp ? "mobile-card-flat border-0 shadow-none" : "";

  return (
    <div className={cn("grid gap-4", isMobileApp ? "grid-cols-1" : "gap-6 md:grid-cols-2")}>
      <Card className={cardClass}>
        <CardHeader className={isMobileApp ? "px-4 pt-4 pb-2" : undefined}>
          <CardTitle className="text-base">Searches</CardTitle>
        </CardHeader>
        <CardContent className={isMobileApp ? "px-2 pb-4" : undefined}>
          <ResponsiveContainer width="100%" height={isMobileApp ? 180 : 250}>
            <BarChart data={data.searches_per_day}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className={isMobileApp ? "px-4 pt-4 pb-2" : undefined}>
          <CardTitle className="text-base">Growth</CardTitle>
        </CardHeader>
        <CardContent className={isMobileApp ? "px-2 pb-4" : undefined}>
          <ResponsiveContainer width="100%" height={isMobileApp ? 180 : 250}>
            <LineChart data={data.workspace_growth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="contacts"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className={isMobileApp ? "px-4 pt-4 pb-2" : undefined}>
          <CardTitle className="text-base">Top contacts</CardTitle>
        </CardHeader>
        <CardContent className={isMobileApp ? "px-4 pb-4" : undefined}>
          <div className={isMobileApp ? "mobile-menu-list !gap-1" : "space-y-3"}>
            {data.top_contacts.map((contact, i) => (
              <div
                key={contact.name}
                className={isMobileApp ? "mobile-list-row !py-2.5" : "flex items-center justify-between"}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium">{contact.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {contact.interactions} interactions
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className={isMobileApp ? "px-4 pt-4 pb-2" : undefined}>
          <CardTitle className="text-base">Engagement</CardTitle>
        </CardHeader>
        <CardContent className={isMobileApp ? "px-2 pb-4" : undefined}>
          <ResponsiveContainer width="100%" height={isMobileApp ? 180 : 250}>
            <BarChart data={data.engagement} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="type" type="category" className="text-xs" width={isMobileApp ? 64 : 80} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
