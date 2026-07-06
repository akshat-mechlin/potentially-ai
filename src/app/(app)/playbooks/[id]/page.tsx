"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronRight,
  GitBranch,
  History,
  Mail,
  Play,
  ScrollText,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RunList } from "@/components/playbooks/run-list";
import { usePlaybook } from "@/hooks/use-playbook";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Skeleton } from "@/components/ui/skeleton";

const sections = [
  { key: "runs", label: "Runs", icon: History },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "sequence", label: "Sequence", icon: GitBranch },
  { key: "templates", label: "Templates", icon: Mail },
  { key: "audit", label: "Audit", icon: ScrollText },
] as const;

export default function PlaybookOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { isMobileApp } = useMobileApp();
  const { data, isLoading } = usePlaybook(id);

  if (isLoading || !data?.playbook) {
    return <Skeleton className="h-48" />;
  }

  const recentRuns = data.runs.slice(0, 3);

  if (isMobileApp) {
    return (
      <div className="space-y-4">
        <div className="mobile-menu-list">
          <Link href={`/playbooks/${id}/runs`} className="mobile-menu-item">
            <span className="mobile-menu-item-icon">
              <Play className="h-4 w-4" />
            </span>
            <span className="flex-1 font-medium">New run</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {sections.map(({ key, label, icon: Icon }) => (
            <Link key={key} href={`/playbooks/${id}/${key}`} className="mobile-menu-item">
              <span className="mobile-menu-item-icon-muted">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 font-medium">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        {recentRuns.length > 0 && (
          <div>
            <p className="mobile-section-label">Recent</p>
            <RunList playbookId={id} runs={recentRuns} />
            {data.runs.length > 3 && (
              <Link
                href={`/playbooks/${id}/runs`}
                className="mt-2 block text-center text-sm font-medium text-primary"
              >
                All runs ({data.runs.length})
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ key, label, icon: Icon }) => (
          <Link key={key} href={`/playbooks/${id}/${key}`}>
            <Card className="h-full transition-all hover:border-primary/40 hover:shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <span className="flex items-center text-sm text-primary">
                  Open
                  <ChevronRight className="ml-1 h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}

        <Link href={`/playbooks/${id}/runs`}>
          <Card className="h-full border-primary/20 bg-primary/5 transition-all hover:border-primary/40 hover:shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Start new run</CardTitle>
              </div>
              <CardDescription>Match contacts and begin outreach</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="flex items-center text-sm text-primary">
                Go to runs
                <ChevronRight className="ml-1 h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Recent runs</h2>
          {data.runs.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/playbooks/${id}/runs`}>
                View all ({data.runs.length})
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        {recentRuns.length ? (
          <RunList playbookId={id} runs={recentRuns} />
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No runs yet.</p>
              <Button className="mt-3" size="sm" asChild>
                <Link href={`/playbooks/${id}/runs`}>
                  <Play className="mr-2 h-4 w-4" />
                  Start your first run
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
