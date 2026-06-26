"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface NetworkGraphProps {
  data: GraphData;
}

export function NetworkGraph({ data }: NetworkGraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const highlightNodes = useMemo(() => {
    if (!searchTerm) return new Set<string>();
    const matches = data.nodes
      .filter((n) => n.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map((n) => n.id);
    return new Set(matches);
  }, [searchTerm, data.nodes]);

  const nodeColor = (node: { id?: string | number }) => {
    const id = String(node.id ?? "");
    if (highlightNodes.size > 0) {
      return highlightNodes.has(id) ? "#6366f1" : "#e2e8f0";
    }
    return "#6366f1";
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">Relationship Graph</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px] w-full bg-muted/20">
          <ForceGraph2D
            ref={graphRef}
            graphData={data}
            nodeLabel="name"
            nodeColor={nodeColor}
            linkColor={() => "#cbd5e1"}
            backgroundColor="transparent"
            nodeRelSize={6}
            linkWidth={1}
            onEngineStop={() => graphRef.current?.zoomToFit(400)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
