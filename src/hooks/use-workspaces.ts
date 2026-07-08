"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isDemoMode, DEMO_WORKSPACE } from "@/lib/demo-data";
import { useWorkspaceStore } from "@/stores";
import type { Workspace, WorkspaceSummary } from "@/types";
import { useIsClient } from "@/hooks/use-is-client";

type WorkspacesResponse = {
  workspaces: WorkspaceSummary[];
};

function toWorkspace(summary: WorkspaceSummary): Workspace {
  return {
    id: summary.id,
    name: summary.name,
    slug: summary.slug,
    logo_url: summary.logo_url,
    plan: summary.plan,
    created_at: summary.created_at,
    updated_at: summary.updated_at,
  };
}

export function useWorkspaces() {
  const mounted = useIsClient();
  const queryClient = useQueryClient();
  const {
    currentWorkspace,
    workspaces,
    setCurrentWorkspace,
    setWorkspaces,
    removeWorkspace,
  } = useWorkspaceStore();

  const { data, isLoading, refetch, isFetched } = useQuery<WorkspacesResponse>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load workspaces");
      return res.json();
    },
    enabled: mounted && !isDemoMode(),
  });

  useEffect(() => {
    if (isDemoMode()) {
      if (!currentWorkspace) {
        setWorkspaces([DEMO_WORKSPACE]);
        setCurrentWorkspace(DEMO_WORKSPACE);
      }
      return;
    }

    if (!isFetched) return;

    const list = data?.workspaces ?? [];
    setWorkspaces(list.map(toWorkspace));

    if (!list.length) {
      setCurrentWorkspace(null);
      return;
    }

    const persisted = currentWorkspace
      ? list.find((workspace) => workspace.id === currentWorkspace.id)
      : null;

    if (persisted) {
      if (currentWorkspace?.id !== persisted.id || currentWorkspace?.name !== persisted.name) {
        setCurrentWorkspace(toWorkspace(persisted));
      }
      return;
    }

    setCurrentWorkspace(toWorkspace(list[0]));
  }, [
    currentWorkspace,
    data?.workspaces,
    isFetched,
    setCurrentWorkspace,
    setWorkspaces,
  ]);

  const switchWorkspace = useCallback(
    (workspace: WorkspaceSummary | Workspace) => {
      const next = "role" in workspace ? toWorkspace(workspace) : workspace;
      setCurrentWorkspace(next);
      queryClient.invalidateQueries({ queryKey: ["workspace-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      queryClient.invalidateQueries({ queryKey: ["connectors"] });
    },
    [queryClient, setCurrentWorkspace],
  );

  const refreshWorkspaces = useCallback(async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["workspace-dashboard"] });
  }, [queryClient, refetch]);

  const evictWorkspace = useCallback(
    (workspaceId: string) => {
      removeWorkspace(workspaceId);
      queryClient.setQueryData<WorkspacesResponse>(["workspaces"], (current) => ({
        workspaces: (current?.workspaces ?? []).filter((workspace) => workspace.id !== workspaceId),
      }));
      queryClient.removeQueries({ queryKey: ["workspace-detail", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["connectors"] });
    },
    [queryClient, removeWorkspace],
  );

  const summaries = isDemoMode()
    ? [{ ...DEMO_WORKSPACE, role: "owner" as const, member_count: 3 }]
    : (data?.workspaces ?? []);

  return {
    workspaces: summaries,
    currentWorkspace: currentWorkspace ?? summaries[0] ?? null,
    isLoading: !mounted || isLoading,
    switchWorkspace,
    refreshWorkspaces,
    evictWorkspace,
  };
}
