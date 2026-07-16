"use client";

import { WORKFLOW_NODE_CATALOG } from "@/lib/workflows/catalog";
import type { WorkflowNodeKind } from "@/types/workflows";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "start", label: "Start" },
  { id: "match", label: "Match" },
  { id: "agent", label: "Agent" },
  { id: "logic", label: "Logic" },
  { id: "action", label: "Actions" },
] as const;

interface NodePaletteProps {
  onAdd: (kind: WorkflowNodeKind) => void;
}

export function NodePalette({ onAdd }: NodePaletteProps) {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card text-foreground">
      <div className="border-b border-border px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nodes</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Click to drop onto the canvas. Wire handles to build your automation.
        </p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-2">
        {CATEGORIES.map((category) => {
          const items = WORKFLOW_NODE_CATALOG.filter((n) => n.category === category.id);
          if (!items.length) return null;
          return (
            <div key={category.id}>
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {category.label}
              </p>
              <div className="space-y-1">
                {items.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => onAdd(item.kind)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border border-transparent px-2 py-2 text-left transition-colors",
                      "hover:border-border hover:bg-secondary/60",
                    )}
                  >
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${item.accent} 22%, transparent)`,
                      }}
                    >
                      <item.icon className="h-3.5 w-3.5" style={{ color: item.accent }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-foreground">{item.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
