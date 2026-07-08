import { NextResponse, type NextRequest } from "next/server";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import type { ConnectorKey } from "@/lib/connectors/types";
import { saveConnectorFromSession, syncConnector } from "@/lib/data/connectors";
import { joinWorkspaceFromInviteToken } from "@/lib/data/workspace-team";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const connector = searchParams.get("connector") as ConnectorKey | null;
  const invite = searchParams.get("invite");
  const legacyConnect = searchParams.get("connect");

  const connectorKey =
    connector ??
    (legacyConnect === "google"
      ? "google_contacts"
      : legacyConnect === "outlook"
        ? "outlook"
        : null);

  const dest = next.startsWith("/") ? next : `/${next}`;
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const response = NextResponse.redirect(`${origin}${dest}`);
  const supabase = createRouteHandlerClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback session exchange failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email) {
    try {
      const { linkConversationThreadsForEmail } = await import("@/lib/data/platform-users");
      await linkConversationThreadsForEmail(user.id, user.email);
    } catch (linkError) {
      console.warn("Chat thread linking on auth failed:", linkError);
    }
  }

  if (connectorKey) {
    const def = getConnectorDefinition(connectorKey);
    try {
      await saveConnectorFromSession(supabase, connectorKey);
      let synced = false;
      if (def?.syncSource === "google_contacts" || def?.syncSource === "outlook") {
        await syncConnector(connectorKey, undefined, supabase);
        synced = true;
      }
      response.headers.set(
        "Location",
        `${origin}${dest}?connected=${connectorKey}${synced ? "&synced=1" : ""}`,
      );
    } catch (connectError) {
      console.error("Connector OAuth failed:", connectError);
      const message =
        connectError instanceof Error ? connectError.message : "Connection failed";
      response.headers.set(
        "Location",
        `${origin}${dest}?connect_error=${encodeURIComponent(message)}`,
      );
    }
    return response;
  }

  if (invite) {
    try {
      await joinWorkspaceFromInviteToken(supabase, invite);
    } catch (inviteError) {
      console.error("Workspace invite join failed:", inviteError);
    }
  }

  return response;
}
