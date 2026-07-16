"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { getNodeDefinition } from "@/lib/workflows/catalog";
import type { WorkflowNodeData, WorkflowNodeKind } from "@/types/workflows";

function WorkflowNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const kind = (nodeData.kind ?? "trigger") as WorkflowNodeKind;
  const def = getNodeDefinition(kind);
  const Icon = def?.icon;
  const accent = def?.accent ?? "var(--primary)";
  const outputIds = def?.handles.outputIds;
  const hasInput = (def?.handles.inputs ?? 0) > 0;
  const hasSingleOutput = !outputIds && (def?.handles.outputs ?? 0) > 0;

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[240px] rounded-xl border bg-card text-left shadow-md transition-shadow",
        selected
          ? "border-[var(--node-accent)] ring-2 ring-[var(--node-accent)]/35"
          : "border-border",
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
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{nodeData.label}</p>
          {nodeData.description ? (
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
