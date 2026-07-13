import { NextResponse } from "next/server";
import { deleteChatMessage } from "@/lib/data/chats";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ runContactId: string; messageId: string }> },
) {
  try {
    const { runContactId, messageId } = await params;
    await deleteChatMessage(runContactId, messageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Conversation not found" || error.message === "Message not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "System messages cannot be deleted") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("Failed to delete message:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
