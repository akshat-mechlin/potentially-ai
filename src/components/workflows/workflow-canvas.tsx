"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
  type Viewport,
} from "@xyflow/react";
import {
  ExternalLink,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
  Workflow as WorkflowIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { NodeConfigPanel } from "@/components/workflows/node-config-panel";
import { NodePalette } from "@/components/workflows/node-palette";
import { WorkflowNode } from "@/components/workflows/workflow-node";
import { WorkflowRunPanel } from "@/components/workflows/workflow-run-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getNodeDefinition } from "@/lib/workflows/catalog";
import { validateWorkflowGraph } from "@/lib/workflows/graph";
import { cn, formatRelativeTime } from "@/lib/utils";
import type {
  Workflow,
  WorkflowGraph,
  WorkflowLastRun,
  WorkflowListItem,
  WorkflowNodeData,
  WorkflowNodeKind,
  WorkflowNodeProgress,
} from "@/types/workflows";

const nodeTypes = {
  trigger: WorkflowNode,
  icp: WorkflowNode,
  segment: WorkflowNode,
  playbook: WorkflowNode,
  condition: WorkflowNode,
  delay: WorkflowNode,
  approve: WorkflowNode,
  action_email: WorkflowNode,
  action_intro: WorkflowNode,
  action_notify: WorkflowNode,
};

function applyNodeProgress(nodes: Node[], progress?: WorkflowNodeProgress[] | null): Node[] {
  if (!progress?.length) return nodes;
  const byId = new Map(progress.map((item) => [item.node_id, item]));
  return nodes.map((node) => {
    const item = byId.get(node.id);
    if (!item) return node;
    return {
      ...node,
      data: {
        ...(node.data as WorkflowNodeData),
        runStatus: item.status,
        runDetail: item.detail,
      },
    };
  });
}

function toFlowNodes(graph: WorkflowGraph, progress?: WorkflowNodeProgress[] | null): Node[] {
  const nodes = (graph.nodes ?? []).map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }));
  return applyNodeProgress(nodes, progress);
}

function toFlowEdges(graph: WorkflowGraph, isDark: boolean): Edge[] {
  const stroke = isDark ? "rgba(255,255,255,0.35)" : "rgba(45,71,57,0.35)";
  const labelFill = isDark ? "rgba(255,255,255,0.55)" : "rgba(45,71,57,0.65)";
  return (graph.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    label: edge.label,
    animated: edge.animated ?? true,
    style: { stroke },
    labelStyle: { fill: labelFill, fontSize: 10 },
  }));
}

function fromFlowGraph(nodes: Node[], edges: Edge[], viewport?: Viewport): WorkflowGraph {
  return {
    nodes: nodes.map((node) => {
      const data = { ...(node.data as WorkflowNodeData) };
      delete data.runStatus;
      delete data.runDetail;
      return {
        id: node.id,
        type: (node.type ?? "trigger") as WorkflowNodeKind,
        position: node.position,
        data,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: typeof edge.label === "string" ? edge.label : undefined,
      animated: edge.animated,
    })),
    viewport: viewport
      ? { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
      : undefined,
  };
}

interface WorkflowCanvasInnerProps {
  workflow: Workflow;
  workflows: WorkflowListItem[];
}

function WorkflowCanvasInner({ workflow, workflows }: WorkflowCanvasInnerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { screenToFlowPosition, getViewport, fitView } = useReactFlow();
  const [name, setName] = useState(workflow.name);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    toFlowNodes(workflow.graph, workflow.last_run?.node_progress),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(workflow.graph, isDark));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastRun, setLastRun] = useState(workflow.last_run);
  const [panelOpen, setPanelOpen] = useState(Boolean(workflow.last_run?.run_id));
  const fitted = useRef(false);

  const refreshRunStatus = useCallback(async () => {
    if (!workflow.id || !lastRun?.run_id) return;
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/run-status`);
      const payload = await res.json();
      if (!res.ok || !payload.last_run) return;
      const next = payload.last_run as WorkflowLastRun;
      setLastRun(next);
      setNodes((current) => applyNodeProgress(current, next.node_progress));
    } catch {
      // ignore status refresh errors
    }
  }, [workflow.id, lastRun?.run_id, setNodes]);

  useEffect(() => {
    void fetch("/api/workflows/run-due", { method: "POST" })
      .then((r) => r.json())
      .then((payload) => {
        if (payload?.ran > 0) {
          toast.success(`Ran ${payload.ran} due scheduled workflow${payload.ran === 1 ? "" : "s"}`);
          void queryClient.invalidateQueries({ queryKey: ["workflows"] });
          void queryClient.invalidateQueries({ queryKey: ["workflow", workflow.id] });
        }
      })
      .catch(() => {});
  }, [queryClient, workflow.id]);

  useEffect(() => {
    if (fitted.current) return;
    const timer = window.setTimeout(() => {
      fitView({ padding: 0.18, duration: 200 });
      fitted.current = true;
    }, 50);
    return () => window.clearTimeout(timer);
  }, [workflow.id, fitView, nodes.length]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const graphSnapshot = useMemo(
    () => fromFlowGraph(nodes, edges, getViewport()),
    [nodes, edges, getViewport],
  );

  const validation = useMemo(() => validateWorkflowGraph(graphSnapshot), [graphSnapshot]);

  const markDirty = useCallback(() => setDirty(true), []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const stroke = isDark ? "rgba(255,255,255,0.35)" : "rgba(45,71,57,0.35)";
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke },
          },
          current,
        ),
      );
      markDirty();
    },
    [setEdges, markDirty, isDark],
  );

  const onSelectionChange = useCallback(({ nodes: selected }: OnSelectionChangeParams) => {
    setSelectedId(selected[0]?.id ?? null);
  }, []);

  const addNode = useCallback(
    (kind: WorkflowNodeKind) => {
      const def = getNodeDefinition(kind);
      if (!def) return;
      const id = `${kind}-${Date.now()}`;
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const node: Node = {
        id,
        type: kind,
        position,
        data: {
          kind,
          label: def.label,
          description: def.description,
          config: { ...def.defaultConfig },
        } satisfies WorkflowNodeData,
      };
      setNodes((current) => [...current, node]);
      setSelectedId(id);
      markDirty();
    },
    [screenToFlowPosition, setNodes, markDirty],
  );

  const updateNodeData = useCallback(
    (nodeId: string, next: WorkflowNodeData) => {
      setNodes((current) =>
        current.map((node) => (node.id === nodeId ? { ...node, data: next } : node)),
      );
      markDirty();
    },
    [setNodes, markDirty],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((current) => current.filter((node) => node.id !== nodeId));
      setEdges((current) =>
        current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
      setSelectedId(null);
      markDirty();
    },
    [setNodes, setEdges, markDirty],
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const graph = fromFlowGraph(nodes, edges, getViewport());
      const res = await fetch(`/api/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Untitled workflow", graph }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
      await queryClient.invalidateQueries({ queryKey: ["workflow", workflow.id] });
      toast.success("Workflow saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, getViewport, workflow.id, name, queryClient]);

  const runWorkflow = useCallback(async () => {
    if (!validation.ok) {
      toast.error(validation.errors[0] ?? "Fix the workflow before running");
      return;
    }

    setRunning(true);
    try {
      if (dirty) {
        const graph = fromFlowGraph(nodes, edges, getViewport());
        const saveRes = await fetch(`/api/workflows/${workflow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() || "Untitled workflow", graph }),
        });
        if (!saveRes.ok) throw new Error("Failed to save before run");
        setDirty(false);
      }

      const res = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Failed to run workflow");

      setLastRun({
        at: payload.at ?? new Date().toISOString(),
        run_id: payload.run_id,
        segment_id: payload.segment_id,
        playbook_id: payload.playbook_id,
        matched_count: payload.matched_count,
        skipped_count: payload.skipped_count,
        dry_run: payload.dry_run,
        warnings: payload.warnings ?? [],
        planned_actions: payload.planned_actions ?? [],
        node_progress: payload.node_progress,
        matches_preview: payload.matches_preview,
        stats: payload.stats,
        notify_sent: payload.notify_sent,
        delay: payload.delay,
        trigger_mode: payload.trigger_mode,
      });
      setNodes((current) => applyNodeProgress(current, payload.node_progress));
      setPanelOpen(true);

      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
      await queryClient.invalidateQueries({ queryKey: ["workflow", workflow.id] });
      await queryClient.invalidateQueries({ queryKey: ["playbook-run", payload.run_id] });

      for (const warning of payload.warnings ?? []) {
        toast.message(warning);
      }

      toast.success(
        `Matched ${payload.matched_count} contact${payload.matched_count === 1 ? "" : "s"}`,
        {
          description: "Review, draft, and send from the panel on the right.",
        },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run workflow");
    } finally {
      setRunning(false);
    }
  }, [
    validation,
    dirty,
    nodes,
    edges,
    getViewport,
    workflow.id,
    name,
    queryClient,
    setNodes,
  ]);

  const createWorkflow = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled workflow" }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Failed to create");
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
      router.push(`/workflows/${payload.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create workflow");
    }
  }, [queryClient, router]);

  const deleteWorkflow = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this workflow?")) return;
      try {
        const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        await queryClient.invalidateQueries({ queryKey: ["workflows"] });
        const next = workflows.find((item) => item.id !== id);
        if (next) router.push(`/workflows/${next.id}`);
        else router.push("/workflows");
        toast.success("Workflow deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete workflow");
      }
    },
    [queryClient, router, workflows],
  );

  return (
    <div className="workflow-playground flex h-full min-h-0 w-full overflow-hidden bg-background text-foreground">
      <div className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WorkflowIcon className="h-4 w-4 text-primary" />
            Workflows
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => void createWorkflow()}
            aria-label="New workflow"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {workflows.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group relative rounded-lg transition-colors",
                item.id === workflow.id ? "bg-secondary" : "hover:bg-muted/60",
              )}
            >
              <Link href={`/workflows/${item.id}`} className="block px-2.5 py-2 pr-8">
                <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {item.node_count} nodes · {item.status}
                </p>
              </Link>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1.5 h-6 w-6 opacity-0 group-hover:opacity-100"
                aria-label={`Delete ${item.name}`}
                onClick={() => void deleteWorkflow(item.id)}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>

        {lastRun && (
          <div className="border-t border-border p-3 text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground">Last run</p>
            <p className="mt-1">
              {lastRun.matched_count} matched · {formatRelativeTime(lastRun.at)}
            </p>
            {lastRun.stats ? (
              <p className="mt-1">
                {lastRun.stats.sent} sent · {lastRun.stats.replied} replies
              </p>
            ) : null}
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
              onClick={() => setPanelOpen(true)}
            >
              Open results
            </button>
            <Link
              href={`/playbook-runs/${lastRun.run_id}`}
              className="mt-1 flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
            >
              Full run page <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      <NodePalette onAdd={addNode} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              markDirty();
            }}
            className="h-8 max-w-sm text-sm"
          />
          {dirty && <span className="text-[11px] text-amber-600 dark:text-amber-300">Unsaved</span>}
          {!validation.ok && (
            <span className="hidden text-[11px] text-destructive sm:inline">
              {validation.errors[0]}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save
            </Button>
            <Button
              size="sm"
              className="h-8"
              onClick={() => void runWorkflow()}
              disabled={running || !validation.ok}
            >
              {running ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5" />
              )}
              Run
            </Button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-muted/30">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              if (changes.some((change) => change.type !== "select")) markDirty();
            }}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              if (changes.some((change) => change.type !== "select")) markDirty();
            }}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            colorMode={isDark ? "dark" : "light"}
            proOptions={{ hideAttribution: true }}
            className="workflow-canvas !bg-transparent"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1}
              color={isDark ? "rgba(255,255,255,0.08)" : "rgba(45,71,57,0.12)"}
            />
            <Controls className="!border-border !bg-card !shadow-md [&>button]:!border-border [&>button]:!bg-card" />
            <MiniMap
              className="!border-border !bg-card"
              maskColor={isDark ? "rgba(0,0,0,0.55)" : "rgba(250,249,245,0.7)"}
              nodeColor={isDark ? "#3d5c4a" : "#2d4739"}
            />
          </ReactFlow>
        </div>
      </div>

      {selectedNode ? (
        <NodeConfigPanel
          nodeId={selectedNode.id}
          data={selectedNode.data as WorkflowNodeData}
          onChange={updateNodeData}
          onClose={() => setSelectedId(null)}
          onDelete={deleteNode}
        />
      ) : null}

      {panelOpen && lastRun?.run_id && lastRun.playbook_id ? (
        <WorkflowRunPanel
          workflowId={workflow.id}
          playbookId={lastRun.playbook_id}
          runId={lastRun.run_id}
          lastRun={lastRun}
          onClose={() => setPanelOpen(false)}
          onStatsChange={() => void refreshRunStatus()}
        />
      ) : null}
    </div>
  );
}

interface WorkflowCanvasProps {
  workflow: Workflow;
  workflows: WorkflowListItem[];
}

export function WorkflowCanvas({ workflow, workflows }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      {/* Remount when switching workflows so local canvas state resets cleanly. */}
      <WorkflowCanvasInner key={workflow.id} workflow={workflow} workflows={workflows} />
    </ReactFlowProvider>
  );
}
