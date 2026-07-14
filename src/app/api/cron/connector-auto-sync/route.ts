import { NextResponse } from "next/server";
import { processDueConnectorAutoSyncs } from "@/lib/data/connectors";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueConnectorAutoSyncs();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Connector auto-sync cron failed:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
