"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Search, Users } from "lucide-react";
import { DashboardWidgets } from "@/components/dashboard/dashboard-widgets";
import {
  DesktopOnly,
  MobileEmpty,
  MobileListSection,
  MobileListTile,
} from "@/components/mobile/primitives";
import { MobileLargeTitle } from "@/components/mobile/native-ui";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import type { Contact, DashboardStats } from "@/types";

export default function DashboardPage() {
  const { isMobileApp } = useMobileApp();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
  });

  const { data: contactsData, isLoading: contactsLoading } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["contacts"],
    queryFn: () => fetch("/api/contacts").then((r) => r.json()),
  });

  const recentContacts = (contactsData?.contacts ?? []).slice(0, 5);
  const recentSearches = (stats?.activity ?? [])
    .filter((item) => item.event.startsWith("AI search:"))
    .reduce<Array<{ id: string; query: string }>>((acc, item) => {
      const query = item.event.replace(/^AI search:\s*/, "");
      if (acc.some((entry) => entry.query === query)) return acc;
      acc.push({ id: item.id, query });
      return acc;
    }, [])
    .slice(0, 3);

  if (isMobileApp) {
    return (
      <div className="space-y-5">
        <MobileLargeTitle title="Home" subtitle="Your network at a glance" />

        {statsLoading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : stats ? (
          <DashboardWidgets stats={stats} />
        ) : null}

        <MobileListSection title="Recent searches">
          {recentSearches.length ? (
            recentSearches.map((entry) => (
              <MobileListTile
                key={entry.id}
                href={`/search?q=${encodeURIComponent(entry.query)}`}
                icon={Search}
                title={entry.query}
                iconMuted
              />
            ))
          ) : (
            <MobileEmpty>No searches yet</MobileEmpty>
          )}
        </MobileListSection>

        <MobileListSection title="Recent contacts">
          {contactsLoading ? (
            <Skeleton className="h-16 rounded-xl" />
          ) : recentContacts.length ? (
            recentContacts.map((c) => (
              <MobileListTile
                key={c.id}
                href={`/contacts/${c.id}`}
                icon={Users}
                title={c.full_name}
                subtitle={c.company_name ?? c.title ?? undefined}
                trailing={
                  c.last_interaction_at ? (
                    <span className="text-[11px] tabular-nums">
                      {formatRelativeTime(c.last_interaction_at)}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-primary">{c.strength_score}%</span>
                  )
                }
                iconMuted
              />
            ))
          ) : (
            <MobileEmpty>No contacts yet</MobileEmpty>
          )}
        </MobileListSection>

        {(stats?.activity ?? []).length > 0 && (
          <MobileListSection title="Activity">
            {(stats?.activity ?? []).slice(0, 8).map((a) => (
              <MobileListTile
                key={a.id}
                title={a.event}
                subtitle={a.time}
                chevron={false}
              />
            ))}
          </MobileListSection>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {statsLoading ? (
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
            <CardTitle>Recent searches</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search">
                New search <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSearches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No searches yet.</p>
            ) : (
              recentSearches.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/search?q=${encodeURIComponent(entry.query)}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-secondary/30"
                >
                  <Search className="h-4 w-4 text-primary" />
                  <span className="text-sub">{entry.query}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent contacts</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/contacts">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {contactsLoading ? (
              <Skeleton className="h-20" />
            ) : recentContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              recentContacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/contacts/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sub font-medium">{c.full_name}</p>
                      <p className="text-sub text-muted-foreground">{c.title}</p>
                    </div>
                  </div>
                  {c.last_interaction_at && (
                    <span className="text-sub text-muted-foreground">
                      {formatRelativeTime(c.last_interaction_at)}
                    </span>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Group activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(stats?.activity ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            ) : (
              (stats?.activity ?? []).map((a) => (
                <div key={a.id} className="text-sub flex items-center justify-between">
                  <span>{a.event}</span>
                  <span className="text-muted-foreground">{a.time}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
