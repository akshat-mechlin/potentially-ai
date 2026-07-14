import { NextResponse } from "next/server";
import { z } from "zod";
import {
  disconnectConnectorAccount,
  listConnectorStates,
  setConnectorAutoSync,
} from "@/lib/data/connectors";
import type { ConnectorKey } from "@/lib/connectors/types";

const autoSyncSchema = z.object({
  connector_key: z.string().min(1),
  enabled: z.boolean(),
});

export async function GET() {
  try {
    const data = await listConnectorStates();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to list connectors:", error);
    return NextResponse.json({ error: "Failed to load connectors" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = autoSyncSchema.parse(body);
    const result = await setConnectorAutoSync(parsed.connector_key as ConnectorKey, parsed.enabled);
    return NextResponse.json({
      ...result,
      message: parsed.enabled
        ? "Daily auto-sync enabled. Records refresh about every 24 hours."
        : "Daily auto-sync turned off.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to update auto-sync";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("id");
    if (!accountId) {
      return NextResponse.json({ error: "Missing account id" }, { status: 400 });
    }
    await disconnectConnectorAccount(accountId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
