import { NextResponse } from "next/server";
import { DEMO_CONTACTS, DEMO_COMPANIES } from "@/lib/demo-data";
import type { GraphData } from "@/types";

export async function GET() {
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

  return NextResponse.json({ nodes, links });
}
