import { NextResponse } from "next/server";
import { z } from "zod";
import { disconnectConnectorAccount, listConnectorStates } from "@/lib/data/connectors";

export async function GET() {
  try {
    const data = await listConnectorStates();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to list connectors:", error);
    return NextResponse.json({ error: "Failed to load connectors" }, { status: 500 });
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
