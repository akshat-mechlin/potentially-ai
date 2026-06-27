import { NextResponse } from "next/server";
import { z } from "zod";
import { createSyncJob } from "@/lib/data/workspace-team";

const syncSchema = z.object({
  source: z.enum([
    "google_contacts",
    "google_calendar",
    "gmail",
    "outlook",
    "csv",
    "google",
    "outlook_mail",
  ]),
  workspace_id: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = syncSchema.parse(body);
    const result = await createSyncJob(parsed.source);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
