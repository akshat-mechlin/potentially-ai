import { isDataDemoMode } from "@/lib/app-config";
import { DEMO_COMPANIES, DEMO_CONTACTS } from "@/lib/demo-data";
import type { GraphData } from "@/types";
import { getUserWorkspaceContext, listUserWorkspaces } from "./workspace";
import { findShortestPath, pathToNames } from "@/lib/graph-utils";

export { findShortestPath, pathToNames };

const GRAPH_CONTACT_LIMIT = 200;

export async function getGraphData(): Promise<GraphData> {
  if (isDataDemoMode()) {
    return buildDemoGraph();
  }

  const { supabase, user, profile } = await getUserWorkspaceContext();
  if (!supabase || !user) {
    return { nodes: [], links: [] };
  }

  const workspaceIds = (await listUserWorkspaces(supabase)).map((workspace) => workspace.id);
  if (!workspaceIds.length) {
    return { nodes: [], links: [] };
  }

  const [{ data: contacts }, { data: companies }, { data: events }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, full_name, strength_score, company_id")
      .in("workspace_id", workspaceIds)
      .order("strength_score", { ascending: false })
      .limit(GRAPH_CONTACT_LIMIT),
    supabase.from("companies").select("id, name").in("workspace_id", workspaceIds),
    supabase
      .from("relationship_events")
      .select("type, contact_a, contact_b")
      .in("workspace_id", workspaceIds)
      .in("type", ["mutual_connection", "introduction"]),
  ]);

  const userNodeId = `user-${user.id}`;
  const nodes: GraphData["nodes"] = [
    {
      id: userNodeId,
      name: profile?.name || "You",
      type: "user",
      val: 20,
    },
    ...(contacts ?? []).map((c) => ({
      id: c.id,
      name: c.full_name,
      type: "contact" as const,
      val: Math.max((c.strength_score ?? 0) / 5, 3),
    })),
    ...(companies ?? []).map((co) => ({
      id: co.id,
      name: co.name,
      type: "company" as const,
      val: 10,
    })),
  ];

  const links: GraphData["links"] = [
    ...(contacts ?? []).map((c) => ({
      source: userNodeId,
      target: c.id,
      type: "connection",
    })),
    ...(contacts ?? [])
      .filter((c) => c.company_id)
      .map((c) => ({
        source: c.id,
        target: c.company_id!,
        type: "works_at",
      })),
    ...(events ?? [])
      .filter((e) => e.contact_a && e.contact_b)
      .map((e) => ({
        source: e.contact_a!,
        target: e.contact_b!,
        type: e.type === "introduction" ? "introduction" : "mutual",
      })),
  ];

  return { nodes, links };
}

function buildDemoGraph(): GraphData {
  const nodes: GraphData["nodes"] = [
    { id: "user-1", name: "You", type: "user", val: 20 },
    ...DEMO_CONTACTS.map((c) => ({
      id: c.id,
      name: c.full_name,
      type: "contact" as const,
      val: c.strength_score / 5,
    })),
    ...DEMO_COMPANIES.map((co) => ({
      id: co.id,
      name: co.name,
      type: "company" as const,
      val: 10,
    })),
  ];

  const links: GraphData["links"] = [
    ...DEMO_CONTACTS.map((c) => ({
      source: "user-1",
      target: c.id,
      type: "connection",
    })),
    ...DEMO_CONTACTS.filter((c) => c.company_id).map((c) => ({
      source: c.id,
      target: c.company_id!,
      type: "works_at",
    })),
    { source: "ct-001", target: "ct-005", type: "mutual" },
    { source: "ct-002", target: "ct-008", type: "mutual" },
    { source: "ct-003", target: "ct-006", type: "introduction" },
  ];

  return { nodes, links };
}
