"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchInterface } from "@/components/search/search-interface";
import { FeatureDisabled } from "@/components/shared/feature-disabled";
import { DesktopOnly } from "@/components/mobile/primitives";
import { useAiSearchEnabled } from "@/hooks/use-feature-flags";
import { Skeleton } from "@/components/ui/skeleton";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialGroupId = searchParams.get("group") ?? undefined;
  return <SearchInterface initialQuery={initialQuery} initialGroupId={initialGroupId} />;
}

export default function SearchPage() {
  const { enabled, loading } = useAiSearchEnabled();

  if (loading) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }

  if (!enabled) {
    return <FeatureDisabled title="AI search" flag="ai_search" />;
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <DesktopOnly>
        <p className="text-sub text-muted-foreground">
          Search your workspace network, or connect Apollo to discover prospects outside your
          synced contacts
        </p>
      </DesktopOnly>
      <Suspense fallback={null}>
        <SearchPageContent />
      </Suspense>
    </div>
  );
}
