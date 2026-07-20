import { NextResponse } from "next/server";
import { z } from "zod";
import { listChats } from "@/lib/data/chats";
import { featureDisabledResponse } from "@/lib/data/feature-flags";

const querySchema = z.object({
  direction: z.enum(["all", "outreach", "inbox"]).optional(),
});

export async function GET(request: Request) {
  try {
    const disabled = await featureDisabledResponse("playbook_mode", "Playbooks");
    if (disabled) return disabled;

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
