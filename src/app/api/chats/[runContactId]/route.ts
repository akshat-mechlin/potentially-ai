import { NextResponse } from "next/server";
import { getChatDetail, hideChat } from "@/lib/data/chats";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runContactId: string }> },
) {
  try {
    const { runContactId } = await params;
    const detail = await getChatDetail(runContactId);
    if (!detail) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error("Failed to load chat detail:", error);
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ runContactId: string }> },
) {
  try {
    const { runContactId } = await params;
    await hideChat(runContactId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to delete chat:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
