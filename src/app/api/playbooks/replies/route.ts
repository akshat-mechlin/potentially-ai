import { NextResponse } from "next/server";
import { z } from "zod";
import { isDataDemoMode } from "@/lib/app-config";
import { listAuditEvents } from "@/lib/data/audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type") ?? undefined;
    const entityId = searchParams.get("entity_id") ?? undefined;
    const logs = await listAuditEvents({ entityType, entityId, limit: 100 });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}

const simulateSchema = z.object({
  run_contact_id: z.string(),
  body: z.string().optional(),
  subject: z.string().optional(),
});

export async function POST(request: Request) {
  if (!isDataDemoMode()) {
    return NextResponse.json(
      { error: "Simulated replies are only available in demo mode" },
      { status: 403 },
    );
  }

  try {
    const body = simulateSchema.parse(await request.json());
    const { handleInboundReply } = await import("@/lib/data/playbook-replies");
    const result = await handleInboundReply({
      runContactId: body.run_contact_id,
      from: "prospect@example.com",
      subject: body.subject ?? "Re: Quick intro",
      body: body.body ?? "Thanks. Happy to chat next week.",
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("Simulate reply failed:", error);
    return NextResponse.json({ error: "Failed to simulate reply" }, { status: 500 });
  }
}
