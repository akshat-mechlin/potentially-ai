"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Search, Users, Activity } from "lucide-react";
import { DashboardWidgets } from "@/components/dashboard/dashboard-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_CONTACTS } from "@/lib/demo-data";
import { formatRelativeTime } from "@/lib/utils";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
  });

  const recentContacts = DEMO_CONTACTS.slice(0, 5);
  const recentSearches = [
    "Find founders connected to me",
    "CTOs in fintech",
    "Who can introduce me to Stripe?",
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your relationship intelligence</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : stats ? (
        <DashboardWidgets stats={stats} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Searches</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search">
                New search <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSearches.map((q) => (
              <Link
                key={q}
                href="/search"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <Search className="h-4 w-4 text-primary" />
                <span className="text-sm">{q}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Contacts</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/contacts">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentContacts.map((c) => (
              <Link
                key={c.id}
                href={`/contacts/${c.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">{c.title}</p>
                  </div>
                </div>
                {c.last_interaction_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(c.last_interaction_at)}
                  </span>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Workspace Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { event: "Synced 47 contacts from Google", time: "2h ago" },
              { event: "AI search: Find CTOs in fintech", time: "5h ago" },
              { event: "Introduction requested to Sarah Chen", time: "1d ago" },
              { event: "New team member joined workspace", time: "2d ago" },
            ].map((a) => (
              <div key={a.event} className="flex items-center justify-between text-sm">
                <span>{a.event}</span>
                <span className="text-muted-foreground">{a.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
