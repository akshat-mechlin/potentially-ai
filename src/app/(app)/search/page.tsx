"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchInterface } from "@/components/search/search-interface";
import { DesktopOnly } from "@/components/mobile/primitives";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  return <SearchInterface initialQuery={initialQuery} />;
}

export default function SearchPage() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <DesktopOnly>
        <p className="text-sub text-muted-foreground">
          Search across all your groups — your own connectors and every teammate&apos;s synced contacts
        </p>
      </DesktopOnly>
      <Suspense fallback={null}>
        <SearchPageContent />
      </Suspense>
    </div>
  );
}
