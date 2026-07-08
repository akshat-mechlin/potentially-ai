import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getWorkspaceEmailSettings,
  updateWorkspaceEmailSettings,
} from "@/lib/data/workspace-email-settings";

const updateSchema = z
  .object({
    mode: z.enum(["platform", "custom"]).optional(),
    custom_sender_name: z.string().max(120).nullable().optional(),
    custom_sender_email: z.string().email().max(320).nullable().optional(),
    workspace_id: z.string().optional(),
  })
  .refine(
    (body) =>
      body.mode !== undefined ||
      body.custom_sender_name !== undefined ||
      body.custom_sender_email !== undefined,
    { message: "Nothing to update" },
  );

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    const settings = await getWorkspaceEmailSettings(workspaceId);
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Email settings fetch failed:", error);
    return NextResponse.json({ error: "Failed to load email settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = updateSchema.parse(await request.json());
    const settings = await updateWorkspaceEmailSettings(
      {
        mode: body.mode,
        customSenderName: body.custom_sender_name,
        customSenderEmail: body.custom_sender_email,
      },
      body.workspace_id,
    );
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
    console.error("Email settings update failed:", error);
    return NextResponse.json({ error: "Failed to update email settings" }, { status: 500 });
  }
}
