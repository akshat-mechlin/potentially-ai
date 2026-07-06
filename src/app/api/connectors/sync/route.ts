import { NextResponse } from "next/server";
import { z } from "zod";
import { syncConnector } from "@/lib/data/connectors";
import type { ConnectorKey } from "@/lib/connectors/types";

const syncSchema = z.object({
  connector_key: z.string(),
  account_id: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { connector_key, account_id } = syncSchema.parse(body);
    const result = await syncConnector(connector_key as ConnectorKey, account_id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
