"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { getNodeDefinition } from "@/lib/workflows/catalog";
import type {
  WorkflowNodeData,
  WorkflowNodeKind,
  WorkflowNodeRunStatus,
} from "@/types/workflows";

const statusStyles: Record<WorkflowNodeRunStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  waiting: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  skipped: "bg-muted text-muted-foreground",
};

function WorkflowNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const kind = (nodeData.kind ?? "trigger") as WorkflowNodeKind;
  const def = getNodeDefinition(kind);
  const Icon = def?.icon;
  const accent = def?.accent ?? "var(--primary)";
  const outputIds = def?.handles.outputIds;
  const hasInput = (def?.handles.inputs ?? 0) > 0;
  const hasSingleOutput = !outputIds && (def?.handles.outputs ?? 0) > 0;
  const runStatus = nodeData.runStatus as WorkflowNodeRunStatus | undefined;
  const runDetail = typeof nodeData.runDetail === "string" ? nodeData.runDetail : undefined;

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[240px] rounded-xl border bg-card text-left shadow-md transition-shadow",
        selected
          ? "border-[var(--node-accent)] ring-2 ring-[var(--node-accent)]/35"
          : "border-border",
        runStatus === "running" && "border-amber-400/70",
        runStatus === "done" && "border-emerald-500/50",
      )}
      style={{ ["--node-accent" as string]: accent }}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-card !bg-primary"
        />
      )}

      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in oklab, ${accent} 22%, transparent)` }}
        >
          {Icon ? <Icon className="h-4 w-4" style={{ color: accent }} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{nodeData.label}</p>
            {runStatus ? (
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                  statusStyles[runStatus],
                )}
              >
                {runStatus}
              </span>
            ) : null}
          </div>
          {runDetail ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-foreground/80">
              {runDetail}
            </p>
          ) : nodeData.description ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {nodeData.description}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{def?.label}</p>
          )}
        </div>
      </div>

      {hasSingleOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-card !bg-primary"
        />
      )}

      {outputIds?.map((handleId, index) => (
        <Handle
          key={handleId}
          id={handleId}
          type="source"
          position={Position.Right}
          style={{ top: `${35 + index * 30}%` }}
          className="!h-2.5 !w-2.5 !border-2 !border-card !bg-primary"
        />
      ))}

      {outputIds && (
        <div className="absolute -right-12 top-[28%] flex flex-col gap-5 text-[10px] font-medium text-muted-foreground">
          {outputIds.map((id) => (
            <span key={id}>{id}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
