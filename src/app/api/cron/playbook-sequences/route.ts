import { NextResponse } from "next/server";
import { processDueSequenceFollowUps } from "@/lib/data/playbook-sequences";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueSequenceFollowUps();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sequence cron failed:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
