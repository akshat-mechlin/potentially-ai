import { NextResponse } from "next/server";
import { z } from "zod";
import { getProspectThreadMessages, postThreadMessage } from "@/lib/data/playbooks";
import { isFeatureEnabled } from "@/lib/data/feature-flags";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string; prospectId: string }> },
) {
  try {
    const { prospectId } = await params;
    const messages = await getProspectThreadMessages(prospectId);
    const chatEnabled = await isFeatureEnabled("platform_chat");
    return NextResponse.json({ messages, chat_enabled: chatEnabled });
  } catch (error) {
    console.error("Failed to load thread:", error);
    return NextResponse.json({ error: "Failed to load thread" }, { status: 500 });
  }
}

const postSchema = z.object({ body: z.string().min(1) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string; prospectId: string }> },
) {
  try {
    const chatEnabled = await isFeatureEnabled("platform_chat");
    if (!chatEnabled) {
      return NextResponse.json({ error: "Platform chat is disabled" }, { status: 403 });
    }

    const { prospectId } = await params;
    const { body } = postSchema.parse(await request.json());
    await postThreadMessage(prospectId, body);
    const messages = await getProspectThreadMessages(prospectId);
    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    console.error("Failed to post thread message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
