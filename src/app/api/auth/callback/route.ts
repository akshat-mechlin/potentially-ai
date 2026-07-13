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
    // Email confirm / magic links may arrive as hash tokens (#access_token=...),
    // which the server never sees. Send users to login so the client can recover the session.
    const confirmUrl = new URL("/login", origin);
    confirmUrl.searchParams.set("verified", "1");
    if (dest && dest !== "/dashboard") {
      confirmUrl.searchParams.set("next", dest);
    }
    if (invite) {
      confirmUrl.searchParams.set("invite", invite);
    }
    return NextResponse.redirect(confirmUrl);
  }

  const response = NextResponse.redirect(`${origin}${dest}`);
  const supabase = createRouteHandlerClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback session exchange failed:", error.message);
    response.headers.set("Location", `${origin}/login?error=auth`);
    return response;
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
        try {
          await syncConnector(connectorKey, undefined, supabase);
          synced = true;
        } catch (syncError) {
          console.error("Connector auto-sync failed:", syncError);
          const syncMessage =
            syncError instanceof Error ? syncError.message : "Sync failed after connect";
          const url = new URL(dest, origin);
          url.searchParams.set("connected", connectorKey);
          url.searchParams.set("sync_error", syncMessage.slice(0, 180));
          response.headers.set("Location", url.toString());
          return response;
        }
      }
      const url = new URL(dest, origin);
      url.searchParams.set("connected", connectorKey);
      if (synced) url.searchParams.set("synced", "1");
      response.headers.set("Location", url.toString());
    } catch (connectError) {
      console.error("Connector OAuth failed:", connectError);
      const message =
        connectError instanceof Error ? connectError.message : "Connection failed";
      const url = new URL(dest, origin);
      url.searchParams.set("connect_error", message.slice(0, 240));
      response.headers.set("Location", url.toString());
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
