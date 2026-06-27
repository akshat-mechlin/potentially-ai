"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { forceCollide } from "d3-force";
import { Maximize2, Minus, Plus, RotateCcw, Search } from "lucide-react";
import type { GraphData, GraphLink, GraphNode } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { findShortestPath, findUserNodeId, pathToNames } from "@/lib/graph-utils";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type LayoutNode = GraphNode & { x?: number; y?: number; fx?: number; fy?: number };

const NODE_COLORS = {
  user: "#2D4A3E",
  contact: "#4A6741",
  company: "#7A9B72",
  dimmed: "#D8DCD4",
  highlight: "#1F3320",
  hover: "#3D5C36",
} as const;

function nodeRadius(type: GraphNode["type"], hovered = false) {
  const base = type === "user" ? 10 : type === "company" ? 9 : 7;
  return hovered ? base + 3 : base;
}

function linkEndpoints(link: GraphLink) {
  const sourceId =
    typeof link.source === "object" ? String((link.source as LayoutNode).id) : String(link.source);
  const targetId =
    typeof link.target === "object" ? String((link.target as LayoutNode).id) : String(link.target);
  return { sourceId, targetId };
}

function seedPositions(data: GraphData): { nodes: LayoutNode[]; links: GraphData["links"] } {
  const nodes: LayoutNode[] = data.nodes.map((n) => ({ ...n }));
  const user = nodes.find((n) => n.type === "user");
  const contacts = nodes.filter((n) => n.type === "contact");
  const companies = nodes.filter((n) => n.type === "company");

  if (user) {
    user.x = 0;
    user.y = 0;
  }

  contacts.forEach((node, i) => {
    const angle = (i / Math.max(contacts.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = 160 + (i % 3) * 12;
    node.x = Math.cos(angle) * radius;
    node.y = Math.sin(angle) * radius;
  });

  companies.forEach((node, i) => {
    const angle = (i / Math.max(companies.length, 1)) * Math.PI * 2;
    const radius = 280;
    node.x = Math.cos(angle) * radius;
    node.y = Math.sin(angle) * radius;
  });

  return { nodes, links: data.links };
}

function getNeighborIds(nodeId: string, links: GraphData["links"]) {
  const neighbors = new Set<string>([nodeId]);
  links.forEach((link) => {
    const { sourceId, targetId } = linkEndpoints(link);
    if (sourceId === nodeId) neighbors.add(targetId);
    if (targetId === nodeId) neighbors.add(sourceId);
  });
  return neighbors;
}

interface NetworkGraphProps {
  data: GraphData;
}

export function NetworkGraph({ data }: NetworkGraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFittedRef = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [hoverNode, setHoverNode] = useState<LayoutNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });

  const graphData = useMemo(() => seedPositions(data), [data]);

  const focusNode = selectedNode ?? hoverNode;

  const highlightNodes = useMemo(() => {
    const matches = new Set<string>();

    if (searchTerm) {
      graphData.nodes
        .filter((n) => n.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .forEach((n) => matches.add(n.id));
    }

    if (focusNode) {
      getNeighborIds(focusNode.id, graphData.links).forEach((id) => matches.add(id));
    }

    return matches;
  }, [searchTerm, focusNode, graphData.nodes, graphData.links]);

  const hasHighlight = Boolean(searchTerm || focusNode);

  const getNodeColor = useCallback(
    (node: LayoutNode) => {
      const id = String(node.id);
      if (hoverNode?.id === node.id) return NODE_COLORS.hover;
      if (hasHighlight) {
        return highlightNodes.has(id) ? NODE_COLORS.highlight : NODE_COLORS.dimmed;
      }
      return NODE_COLORS[node.type] ?? NODE_COLORS.contact;
    },
    [hasHighlight, highlightNodes, hoverNode],
  );

  const connectionCount = (nodeId: string) =>
    graphData.links.filter((link) => {
      const { sourceId, targetId } = linkEndpoints(link);
      return sourceId === nodeId || targetId === nodeId;
    }).length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    hasFittedRef.current = false;
  }, [graphData]);

  const configureForces = useCallback(() => {
    const graph = graphRef.current;
    if (!graph?.d3Force) return;

    graph.d3Force("charge")?.strength(-220);
    graph
      .d3Force("link")
      ?.distance((link: GraphLink) => {
        if (link.type === "works_at") return 95;
        if (link.type === "mutual" || link.type === "introduction") return 75;
        return 130;
      })
      .strength((link: GraphLink) => {
        if (link.type === "works_at") return 0.7;
        if (link.type === "mutual" || link.type === "introduction") return 0.85;
        return 0.45;
      });

    graph.d3Force(
      "collision",
      forceCollide<LayoutNode>().radius((node) => nodeRadius(node.type) + 14),
    );
  }, []);

  useEffect(() => {
    configureForces();
  }, [graphData, configureForces]);

  const fitView = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.zoomToFit(400, 70);
  }, []);

  const zoomBy = (factor: number) => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.zoom(graph.zoom() * factor, 250);
  };

  const centerOnNode = (node: LayoutNode) => {
    const graph = graphRef.current;
    if (!graph || node.x === undefined || node.y === undefined) return;
    graph.centerAt(node.x, node.y, 500);
    graph.zoom(1.8, 500);
    setSelectedNode(node);
  };

  const resetView = () => {
    setSelectedNode(null);
    setHoverNode(null);
    setSearchTerm("");
    hasFittedRef.current = false;

    graphData.nodes.forEach((node) => {
      node.fx = undefined;
      node.fy = undefined;
    });

    const user = graphData.nodes.find((n) => n.type === "user");
    if (user) {
      user.fx = 0;
      user.fy = 0;
    }

    graphRef.current?.d3ReheatSimulation();
    setTimeout(fitView, 400);
  };

  const stats = useMemo(
    () => ({
      contacts: graphData.nodes.filter((n) => n.type === "contact").length,
      companies: graphData.nodes.filter((n) => n.type === "company").length,
      connections: graphData.links.length,
    }),
    [graphData.nodes, graphData.links],
  );

  const sidebarNodes = useMemo(
    () =>
      [...graphData.nodes].sort((a, b) => {
        if (a.type === "user") return -1;
        if (b.type === "user") return 1;
        return a.name.localeCompare(b.name);
      }),
    [graphData.nodes],
  );

  const introPath = useMemo(() => {
    if (!selectedNode || selectedNode.type === "user") return null;
    const userId = findUserNodeId(graphData);
    if (!userId) return null;
    const path = findShortestPath(graphData, userId, selectedNode.id);
    if (!path || path.length < 2) return null;
    return pathToNames(graphData, path);
  }, [graphData, selectedNode]);

  const drawNode = (node: LayoutNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (node.x === undefined || node.y === undefined) return;

    const isHovered = hoverNode?.id === node.id;
    const isSelected = selectedNode?.id === node.id;
    const r = nodeRadius(node.type, isHovered || isSelected);

    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(74, 103, 65, 0.15)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = (node.type === "user" || isSelected ? 2.5 : 1.5) / globalScale;
    ctx.stroke();

    const fontSize = Math.max(10 / globalScale, 4);
    const showLabel = isHovered || isSelected || !hasHighlight || highlightNodes.has(String(node.id));
    if (!showLabel) return;

    ctx.font = `${node.type === "user" || isSelected ? "600" : "400"} ${fontSize}px "Fira Sans", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle =
      hasHighlight && !highlightNodes.has(String(node.id))
        ? "rgba(26, 26, 26, 0.25)"
        : "#1A1A1A";
    ctx.fillText(node.name, node.x, node.y + r + 2 / globalScale);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-4 border-b border-border bg-card pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Relationship Graph</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Hover to highlight · drag to rearrange · scroll to zoom · click for details
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{stats.contacts} contacts</Badge>
            <Badge variant="secondary">{stats.companies} companies</Badge>
            <Badge variant="secondary">{stats.connections} links</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLORS.user }} />
                You
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLORS.contact }} />
                Contact
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLORS.company }} />
                Company
              </span>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => zoomBy(1.3)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => zoomBy(1 / 1.3)}>
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={fitView}>
              <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
              Fit
            </Button>
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-0 p-0 lg:grid-cols-[1fr_220px]">
        <div
          ref={containerRef}
          className="relative h-[min(420px,55dvh)] w-full cursor-grab bg-secondary/20 active:cursor-grabbing sm:h-[480px] lg:h-[520px]"
        >
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel=""
            linkColor={(link) => {
              if (!hasHighlight) {
                if (link.type === "mutual" || link.type === "introduction") return "#4A6741";
                if (link.type === "works_at") return "#9AAD92";
                return "#B8C4B0";
              }
              const { sourceId, targetId } = linkEndpoints(link as GraphLink);
              return highlightNodes.has(sourceId) && highlightNodes.has(targetId)
                ? "#4A6741"
                : "#E8EBE4";
            }}
            linkWidth={(link) => {
              if (!hasHighlight) return link.type === "introduction" ? 2 : 1.2;
              const { sourceId, targetId } = linkEndpoints(link as GraphLink);
              return highlightNodes.has(sourceId) && highlightNodes.has(targetId) ? 2.5 : 0.6;
            }}
            linkDirectionalParticles={(link) =>
              link.type === "introduction" ? 3 : link.type === "mutual" ? 1 : 0
            }
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleWidth={2}
            backgroundColor="transparent"
            warmupTicks={120}
            cooldownTicks={200}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.25}
            enableNodeDrag
            enableZoomInteraction
            enablePanInteraction
            onNodeDrag={(node) => {
              const n = node as LayoutNode;
              n.fx = n.x;
              n.fy = n.y;
            }}
            onNodeDragEnd={(node) => {
              const n = node as LayoutNode;
              if (n.type !== "user") {
                n.fx = n.x;
                n.fy = n.y;
              }
            }}
            onNodeHover={(node) => {
              setHoverNode((node as LayoutNode) ?? null);
              if (containerRef.current) {
                containerRef.current.style.cursor = node ? "pointer" : "grab";
              }
            }}
            onNodeClick={(node) => {
              const n = node as LayoutNode;
              setSelectedNode((prev) => (prev?.id === n.id ? null : n));
            }}
            onBackgroundClick={() => setSelectedNode(null)}
            onEngineStop={() => {
              configureForces();
              if (!hasFittedRef.current) {
                fitView();
                hasFittedRef.current = true;
              }
            }}
            nodeCanvasObjectMode={() => "replace"}
            nodePointerAreaPaint={(node, color, ctx) => {
              const n = node as LayoutNode;
              if (n.x === undefined || n.y === undefined) return;
              const r = nodeRadius(n.type) + 4;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
              ctx.fill();
            }}
            nodeCanvasObject={(node, ctx, globalScale) =>
              drawNode(node as LayoutNode, ctx, globalScale)
            }
          />

          {selectedNode && (
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm sm:right-auto sm:max-w-xs">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {selectedNode.type === "user"
                  ? "You"
                  : selectedNode.type === "company"
                    ? "Company"
                    : "Contact"}
              </p>
              <p className="font-display mt-1 text-lg">{selectedNode.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {connectionCount(selectedNode.id)} connection
                {connectionCount(selectedNode.id) === 1 ? "" : "s"}
              </p>
              {introPath && (
                <p className="mt-2 text-xs text-primary">
                  Intro path: {introPath.join(" → ")}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => centerOnNode(selectedNode)}
                >
                  Focus
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setSelectedNode(null)}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-card lg:border-l lg:border-t-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Explore network</p>
            <p className="text-xs text-muted-foreground">Click a name to focus</p>
          </div>
          <ScrollArea className="h-[200px] lg:h-[520px]">
            <div className="space-y-1 p-2">
              {sidebarNodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onMouseEnter={() => setHoverNode(node)}
                  onMouseLeave={() => setHoverNode(null)}
                  onClick={() => centerOnNode(node)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    selectedNode?.id === node.id
                      ? "bg-secondary text-primary"
                      : "hover:bg-secondary/60",
                  )}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: NODE_COLORS[node.type] }}
                  />
                  <span className="truncate">{node.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {node.type === "user" ? "you" : connectionCount(node.id)}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
