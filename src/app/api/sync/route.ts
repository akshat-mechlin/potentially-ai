import { NextResponse } from "next/server";
import { z } from "zod";

const syncSchema = z.object({
  source: z.enum(["google_contacts", "google_calendar", "gmail", "outlook", "csv"]),
  workspace_id: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source } = syncSchema.parse(body);

    const jobId = `sync-${Date.now()}`;

    return NextResponse.json({
      job_id: jobId,
      source,
      status: "pending",
      message: `Sync job started for ${source}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
