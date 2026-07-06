"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check, Loader2 } from "lucide-react";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { workspaces, currentWorkspace, isLoading, switchWorkspace } = useWorkspaces();
  const active = currentWorkspace;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">
            {isLoading ? "Loading..." : active?.name ?? "Select group"}
          </span>
          {isLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-1">
        <div
          className={
            workspaces.length > 9 ? "max-h-72 overflow-y-auto overscroll-y-contain" : undefined
          }
        >
          {workspaces.length === 0 ? (
            <DropdownMenuItem disabled>No groups yet</DropdownMenuItem>
          ) : (
            workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => switchWorkspace(workspace)}
                className="flex items-center justify-between"
              >
                <span className="truncate">{workspace.name}</span>
                {workspace.id === active?.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            sessionStorage.setItem("open-group-create", "1");
            router.push("/groups");
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const GroupSwitcher = WorkspaceSwitcher;
