import { NextResponse } from "next/server";
import { z } from "zod";
import {
  configureWorkspaceSenderDomain,
  markWorkspaceSenderDomainVerified,
  setupWorkspaceSenderDomain,
  verifyWorkspaceSenderDomain,
} from "@/lib/data/workspace-email-settings";

const bodySchema = z.object({
  action: z.enum(["setup", "verify", "sync", "configure", "mark_verified"]),
  workspace_id: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const settings =
      body.action === "configure"
        ? await configureWorkspaceSenderDomain(body.workspace_id)
        : body.action === "mark_verified"
          ? await markWorkspaceSenderDomainVerified(body.workspace_id)
          : body.action === "verify" || body.action === "sync"
            ? await verifyWorkspaceSenderDomain(body.workspace_id)
            : await setupWorkspaceSenderDomain(body.workspace_id);
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes("owners and admins")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Domain setup failed:", error);
    return NextResponse.json({ error: "Failed to update domain setup" }, { status: 500 });
  }
}
