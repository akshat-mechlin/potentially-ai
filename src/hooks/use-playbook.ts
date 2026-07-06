"use client";

import { useQuery } from "@tanstack/react-query";
import { useIsClient } from "@/hooks/use-is-client";
import type { Playbook, PlaybookRun } from "@/types/playbooks";

export type PlaybookDetailResponse = {
  playbook: Playbook;
  runs: PlaybookRun[];
};

export function usePlaybook(playbookId: string | undefined) {
  const mounted = useIsClient();

  return useQuery<PlaybookDetailResponse>({
    queryKey: ["playbook", playbookId],
    queryFn: () => fetch(`/api/playbooks/${playbookId}`).then((r) => r.json()),
    enabled: mounted && !!playbookId,
  });
}
