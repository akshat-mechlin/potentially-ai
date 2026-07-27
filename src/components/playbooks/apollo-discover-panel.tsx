"use client";

import { ApolloSearchPanel } from "@/components/connectors/apollo-search-panel";
import type { IcpProfile } from "@/types/playbooks";

type ApolloDiscoverPanelProps = {
  runId: string;
  icpProfile?: IcpProfile | null;
  compact?: boolean;
  onImported?: () => void;
};

export function ApolloDiscoverPanel({
  runId,
  icpProfile,
  compact,
  onImported,
}: ApolloDiscoverPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Save prospects to your Apollo tab first. When you are ready, open the Apollo tab to enrich
        them and add them to Contacts. Then add those contacts to this run from Contacts or
        segments.
      </p>
      <ApolloSearchPanel
        runId={runId}
        icpProfile={icpProfile}
        compact={compact}
        onSaved={onImported}
        onImported={onImported}
      />
    </div>
  );
}
