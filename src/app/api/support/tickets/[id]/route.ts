import { NextResponse } from "next/server";
import { z } from "zod";
import { getMyTicket, replyToMyTicket } from "@/lib/data/support-tickets";
import { featureDisabledResponse } from "@/lib/data/feature-flags";
import { collectFormFiles } from "@/lib/support/attachments";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const disabled = await featureDisabledResponse("support_ticketing", "Support Ticketing");
    if (disabled) return disabled;
    const { id } = await context.params;
    const data = await getMyTicket(id);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get ticket failed:", error);
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
}

const replySchema = z.object({
  body: z.string().max(10000).default(""),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const disabled = await featureDisabledResponse("support_ticketing", "Support Ticketing");
    if (disabled) return disabled;
    const { id } = await context.params;

    const contentType = request.headers.get("content-type") || "";
    let body = "";
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      body = String(form.get("body") ?? "");
      files = collectFormFiles(form);
    } else {
      body = replySchema.parse(await request.json()).body;
    }

    if (!body.trim() && files.length === 0) {
      return NextResponse.json(
        { error: "Write a reply or attach a file." },
        { status: 400 },
      );
    }

    const message = await replyToMyTicket(id, body, files);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Reply ticket failed:", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
