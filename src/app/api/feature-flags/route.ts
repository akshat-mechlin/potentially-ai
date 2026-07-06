import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/data/feature-flags";

export async function GET() {
  const [playbook_mode, platform_chat] = await Promise.all([
    isFeatureEnabled("playbook_mode"),
    isFeatureEnabled("platform_chat"),
  ]);

  return NextResponse.json({ playbook_mode, platform_chat });
}
