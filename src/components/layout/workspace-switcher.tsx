"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useWorkspaceStore } from "@/stores";
import { DEMO_WORKSPACE } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect } from "react";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { currentWorkspace, workspaces, setCurrentWorkspace, setWorkspaces } =
    useWorkspaceStore();

  useEffect(() => {
    if (isDemoMode() && !currentWorkspace) {
      setWorkspaces([DEMO_WORKSPACE]);
      setCurrentWorkspace(DEMO_WORKSPACE);
    }
  }, [currentWorkspace, setCurrentWorkspace, setWorkspaces]);

  const active = currentWorkspace || DEMO_WORKSPACE;
  const list = workspaces.length > 0 ? workspaces : [DEMO_WORKSPACE];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">{active.name}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {list.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => setCurrentWorkspace(ws)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{ws.name}</span>
            {ws.id === active.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/workspace?action=create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
