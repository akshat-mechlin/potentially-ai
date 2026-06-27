import type { GraphData } from "@/types";

export function findShortestPath(
  graph: GraphData,
  fromId: string,
  toId: string,
): string[] | null {
  if (fromId === toId) return [fromId];

  const adjacency = new Map<string, Set<string>>();
  graph.links.forEach((link) => {
    const a = String(link.source);
    const b = String(link.target);
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  });

  const queue: string[] = [fromId];
  const visited = new Set([fromId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) ?? new Set();

    for (const next of neighbors) {
      if (visited.has(next)) continue;
      visited.add(next);
      parent.set(next, current);
      if (next === toId) {
        const path = [toId];
        let node = toId;
        while (parent.has(node)) {
          node = parent.get(node)!;
          path.unshift(node);
        }
        return path;
      }
      queue.push(next);
    }
  }

  return null;
}

export function pathToNames(graph: GraphData, path: string[]) {
  const nameById = new Map(graph.nodes.map((n) => [n.id, n.name]));
  return path.map((id) => nameById.get(id) ?? id);
}

export function findUserNodeId(graph: GraphData) {
  return graph.nodes.find((n) => n.type === "user")?.id ?? null;
}
