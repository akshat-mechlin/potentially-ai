import { NextResponse, type NextRequest } from "next/server";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import type { ConnectorKey } from "@/lib/connectors/types";
import { saveConnectorFromSession, syncConnector } from "@/lib/data/connectors";
import { joinWorkspaceFromInviteToken } from "@/lib/data/workspace-team";
import { PENDING_CONNECTOR_COOKIE } from "@/lib/oauth/scopes";
import { resolveAppUrl } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function resolveConnectorKey(request: NextRequest): ConnectorKey | null {
  const { searchParams } = request.nextUrl;
  const connector = searchParams.get("connector") as ConnectorKey | null;
  if (connector) return connector;

  const legacyConnect = searchParams.get("connect");
  if (legacyConnect === "google") return "google_contacts";
  if (legacyConnect === "outlook") return "outlook";

  const fromCookie = request.cookies.get(PENDING_CONNECTOR_COOKIE)?.value;
  if (!fromCookie) return null;
  try {
    return decodeURIComponent(fromCookie) as ConnectorKey;
  } catch {
    return fromCookie as ConnectorKey;
  }
}

function clearPendingConnector(response: NextResponse) {
  response.cookies.set(PENDING_CONNECTOR_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });
}

function connectorsErrorRedirect(origin: string, message: string, reconnect?: ConnectorKey) {
  const url = new URL("/connectors", origin);
  url.searchParams.set("connect_error", message.slice(0, 240));
  if (reconnect) url.searchParams.set("reconnect", reconnect);
  const response = NextResponse.redirect(url);
  clearPendingConnector(response);
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const oauthErrorCode = searchParams.get("error_code");
  const oauthErrorDescription = searchParams.get("error_description");
  const invite = searchParams.get("invite");
  const connectorKey = resolveConnectorKey(request);

  const rawNext = searchParams.get("next");
  let dest = rawNext && rawNext.startsWith("/") ? rawNext : "/dashboard";
  if (connectorKey) dest = "/connectors";

  // Prefer APP_URL / public host over request.nextUrl.origin (often localhost behind tunnel).
  const origin = resolveAppUrl(request);

  // Supabase returns error=* here when linkIdentity hits identity_already_exists, etc.
  // Previously we ignored this and silently bounced to /login — no toast, no sync.
  if (oauthError) {
    const description = oauthErrorDescription
      ? decodeURIComponent(oauthErrorDescription.replace(/\+/g, " "))
      : oauthError;
    console.error("[oauth.callback] provider error", {
      oauthError,
      oauthErrorCode,
      description,
      connectorKey,
    });

    if (connectorKey) {
      const alreadyLinked =
        oauthErrorCode === "identity_already_exists" ||
        description.toLowerCase().includes("already linked");

      if (alreadyLinked) {
        return connectorsErrorRedirect(
          origin,
          "This Google account is already linked to your login. Click Connect again — we will re-request Contacts access.",
          connectorKey,
        );
      }

      return connectorsErrorRedirect(origin, description || "Google connection failed.");
    }

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "auth");
    loginUrl.searchParams.set("error_description", description.slice(0, 180));
    return NextResponse.redirect(loginUrl);
  }

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
    if (connectorKey) {
      // Pending connector connect without code — surface it instead of a silent login bounce.
      return connectorsErrorRedirect(
        origin,
        "Google did not return an authorization code. Try Connect again.",
      );
    }
    return NextResponse.redirect(confirmUrl);
  }

  const response = NextResponse.redirect(`${origin}${dest}`);
  const supabase = createRouteHandlerClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback session exchange failed:", error.message);
    if (connectorKey) {
      return connectorsErrorRedirect(
        origin,
        `Sign-in exchange failed: ${error.message}. Try Connect again.`,
      );
    }
    clearPendingConnector(response);
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
    const session = (await supabase.auth.getSession()).data.session;
    console.log("[oauth.callback] connector connect", {
      connectorKey,
      hasProviderToken: Boolean(session?.provider_token),
      userId: user?.id ?? null,
    });

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
          const url = new URL("/connectors", origin);
          url.searchParams.set("connected", connectorKey);
          url.searchParams.set("sync_error", syncMessage.slice(0, 180));
          clearPendingConnector(response);
          response.headers.set("Location", url.toString());
          return response;
        }
      }
      const url = new URL("/connectors", origin);
      url.searchParams.set("connected", connectorKey);
      if (synced) url.searchParams.set("synced", "1");
      clearPendingConnector(response);
      response.headers.set("Location", url.toString());
    } catch (connectError) {
      console.error("Connector OAuth failed:", connectError);
      const message =
        connectError instanceof Error ? connectError.message : "Connection failed";
      const url = new URL("/connectors", origin);
      url.searchParams.set("connect_error", message.slice(0, 240));
      clearPendingConnector(response);
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

  clearPendingConnector(response);
  return response;
}
