import { NextResponse } from "next/server";
import { listAuditEvents } from "@/lib/data/audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type") ?? undefined;
    const entityId = searchParams.get("entity_id") ?? undefined;
    const logs = await listAuditEvents({
      entityType,
      entityId,
      limit: Number(searchParams.get("limit") ?? 100),
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
