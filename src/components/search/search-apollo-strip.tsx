"use client";

import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApolloConnector } from "@/hooks/use-apollo-connector";

export function SearchApolloStrip() {
  const { isLoading, connected, accountLabel, connectHref } = useApolloConnector();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <span>Checking Apollo connection…</span>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Apollo connected{accountLabel ? ` (${accountLabel})` : ""}. Search queries Apollo first
            and saves matches to Potentially.
          </span>
        </div>
        <Button variant="link" size="sm" className="h-auto px-0 text-primary" asChild>
          <Link href="/connectors/apollo">Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
      <span>
        Connect Apollo to search outside your workspace network. Without Apollo, search uses your
        synced contacts only.
      </span>
      <Button variant="outline" size="sm" asChild>
        <Link href={connectHref}>Connect Apollo</Link>
      </Button>
    </div>
  );
}
