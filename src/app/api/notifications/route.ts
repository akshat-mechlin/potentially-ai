import { NextResponse } from "next/server";
import { listNotifications, markNotificationsRead } from "@/lib/data/workspace-team";

export async function GET() {
  try {
    const notifications = await listNotifications();
    const unread = notifications.filter((n) => !n.read).length;
    return NextResponse.json({ notifications, unread });
  } catch (error) {
    console.error("Notifications failed:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    await markNotificationsRead();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications update failed:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
