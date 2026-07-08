import { NextResponse } from "next/server";
import { z } from "zod";
import { listChats } from "@/lib/data/chats";
import { linkConversationThreadsForEmail } from "@/lib/data/platform-users";
import { getUserWorkspaceContext } from "@/lib/data/workspace";

const querySchema = z.object({
  direction: z.enum(["all", "outreach", "inbox"]).optional(),
});

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getUserWorkspaceContext();
    if (supabase && user?.email) {
      await linkConversationThreadsForEmail(user.id, user.email);
    }

    const { searchParams } = new URL(request.url);
    const { direction = "all" } = querySchema.parse({
      direction: searchParams.get("direction") ?? "all",
    });
    const chats = await listChats(direction);
    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Failed to list chats:", error);
    return NextResponse.json({ error: "Failed to load chats" }, { status: 500 });
  }
}
