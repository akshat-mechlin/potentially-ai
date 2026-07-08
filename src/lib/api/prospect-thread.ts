import { NextResponse } from "next/server";
import { z } from "zod";
import { filterThreadMessagesForViewer } from "@/lib/chat/thread-visibility";
import { getThreadForRunContact } from "@/lib/data/conversation-threads";
import { getProspectThreadMessages, getProspectThreadContext, postThreadMessage } from "@/lib/data/playbooks";
import { isFeatureEnabled } from "@/lib/data/feature-flags";
import { getUserWorkspaceContext } from "@/lib/data/workspace";

async function buildThreadPayload(runContactId: string) {
  const { supabase, user } = await getUserWorkspaceContext();
  const [rawMessages, chat_enabled, context] = await Promise.all([
    getProspectThreadMessages(runContactId),
    isFeatureEnabled("platform_chat"),
    getProspectThreadContext(runContactId),
  ]);
  const messages = filterThreadMessagesForViewer(rawMessages, context.viewer_role);
  const thread =
    supabase && user
      ? await getThreadForRunContact(supabase, runContactId, user.id)
      : null;

  return {
    messages,
    thread_id: thread?.id ?? rawMessages[0]?.thread_id ?? null,
    chat_enabled,
    delivery_mode: context.delivery_mode,
    recipient_on_platform: context.recipient_on_platform,
    viewer_role: context.viewer_role,
  };
}

export async function loadProspectThread(runContactId: string) {
  return NextResponse.json(await buildThreadPayload(runContactId));
}

const postSchema = z.object({ body: z.string().min(1) });

export async function sendProspectThreadMessage(runContactId: string, request: Request) {
  const chat_enabled = await isFeatureEnabled("platform_chat");
  if (!chat_enabled) {
    return NextResponse.json({ error: "Platform chat is disabled" }, { status: 403 });
  }

  const { body } = postSchema.parse(await request.json());
  await postThreadMessage(runContactId, body);
  return NextResponse.json(await buildThreadPayload(runContactId));
}

export function prospectThreadErrorResponse(error: unknown, action: "load" | "send" = "load") {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof Error && error.message === "Prospect not found") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error(`Failed to ${action} prospect thread:`, error);
  return NextResponse.json(
    { error: action === "send" ? "Failed to send message" : "Failed to load thread" },
    { status: 500 },
  );
}
