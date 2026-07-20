"use client";

import { useQuery } from "@tanstack/react-query";
import { useIsClient } from "@/hooks/use-is-client";
import type { FeatureFlagKey, FeatureFlagsMap } from "@/lib/admin/feature-flags-catalog";

export function useFeatureFlags() {
  const mounted = useIsClient();

  return useQuery<FeatureFlagsMap>({
    queryKey: ["feature-flags"],
    queryFn: () => fetch("/api/feature-flags").then((r) => r.json()),
    enabled: mounted,
    staleTime: 30_000,
  });
}

/** Fail-closed: only true when the API explicitly returns true for the flag. */
export function useFlag(key: FeatureFlagKey) {
  const { data, isLoading } = useFeatureFlags();
  return {
    enabled: data?.[key] === true,
    loading: isLoading,
  };
}

export function usePlaybookEnabled() {
  return useFlag("playbook_mode");
}

export function useAnalyticsEnabled() {
  return useFlag("analytics");
}

export function useAiSearchEnabled() {
  return useFlag("ai_search");
}

export function useGraphViewEnabled() {
  return useFlag("graph_view");
}

export function useOutreachEnabled() {
  return useFlag("outreach_engine");
}

export function useTeamCollaborationEnabled() {
  return useFlag("team_collaboration");
}

export function useCsvImportEnabled() {
  return useFlag("csv_import");
}

export function usePlatformChatEnabled() {
  return useFlag("platform_chat");
}
