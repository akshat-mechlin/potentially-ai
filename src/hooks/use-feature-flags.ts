"use client";

import { useQuery } from "@tanstack/react-query";
import { useIsClient } from "@/hooks/use-is-client";

export function useFeatureFlags() {
  const mounted = useIsClient();

  return useQuery<{ playbook_mode: boolean; platform_chat: boolean }>({
    queryKey: ["feature-flags"],
    queryFn: () => fetch("/api/feature-flags").then((r) => r.json()),
    enabled: mounted,
    staleTime: 60_000,
  });
}

export function usePlaybookEnabled() {
  const { data, isLoading } = useFeatureFlags();
  return {
    enabled: data?.playbook_mode !== false,
    loading: isLoading,
  };
}
