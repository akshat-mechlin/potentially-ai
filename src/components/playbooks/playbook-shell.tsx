"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPlaybookNavActive, playbookNavItems } from "@/lib/playbook-nav-items";
import { usePlaybook } from "@/hooks/use-playbook";
import { usePlaybookEnabled } from "@/hooks/use-feature-flags";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { MobileHeaderTitle } from "@/components/layout/mobile-header-title";
import { getPlaybookPageTitle } from "@/lib/playbook-nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlaybookShell({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const { enabled: playbooksEnabled } = usePlaybookEnabled();
  const { isMobileApp } = useMobileApp();
  const { data, isLoading } = usePlaybook(id);
  const navItems = playbookNavItems(id);
  const isProspectPage = pathname.includes("/prospects/");
  const subPageTitle = getPlaybookPageTitle(pathname);
  const mobileTitle =
    subPageTitle && subPageTitle !== "Playbook" ? subPageTitle : data?.playbook?.name ?? null;

  if (!playbooksEnabled) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Playbooks are disabled. Enable <code>playbook_mode</code> in Admin.
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data?.playbook) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isProspectPage && isMobileApp) {
    return <div className="mobile-prospect-screen flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <div className={cn("space-y-6", isMobileApp && "mobile-playbook-screen space-y-0")}>
      {isMobileApp && <MobileHeaderTitle title={mobileTitle} />}

      <div className={cn(isMobileApp ? "space-y-0" : "space-y-4")}>
        <Button
          variant="ghost"
          size="sm"
          className={cn("-ml-2 h-8 px-2", isMobileApp && "mobile-hide")}
          asChild
        >
          <Link href="/playbooks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All playbooks
          </Link>
        </Button>

        <div className={cn(isMobileApp ? "mobile-hide" : "")}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{data.playbook.name}</h1>
            <Badge>{data.playbook.status}</Badge>
            <Badge variant="outline">{data.playbook.automation_level} mode</Badge>
          </div>
          {data.playbook.goal && (
            <p className="mt-1 text-sm text-muted-foreground">{data.playbook.goal}</p>
          )}
        </div>

        {!isProspectPage && (
          <nav
            className={cn(
              isMobileApp
                ? "mobile-pill-nav sticky top-0 z-20 bg-[var(--mobile-surface)] pt-1"
                : "flex gap-1 overflow-x-auto border-b border-border pb-px",
            )}
          >
            {navItems.map((item) => {
              const active = isPlaybookNavActive(pathname, item);
              if (isMobileApp) {
                return (
                  <Link
                    key={item.segment}
                    href={item.segment}
                    data-active={active}
                    className="mobile-pill-nav-item"
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.segment}
                  href={item.segment}
                  className={cn(
                    "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className={cn(isMobileApp && !isProspectPage && "px-3 pb-3 pt-2")}>{children}</div>
    </div>
  );
}
