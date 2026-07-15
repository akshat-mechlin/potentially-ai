import { NextResponse, type NextRequest } from "next/server";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import type { ConnectorKey } from "@/lib/connectors/types";
import { resolveOAuthReturnOrigin } from "@/lib/app-url";
import {
  buildAzureAuthorizeUrl,
  buildGoogleAuthorizeUrl,
  CONNECTOR_OAUTH_STATE_COOKIE,
  createConnectorOAuthState,
  encodeConnectorOAuthStateCookie,
  getConnectorOAuthCallbackUrl,
  supportsDirectConnectorOAuth,
} from "@/lib/oauth/connector-oauth";
import { createClient } from "@/lib/supabase/server";

function connectorsErrorRedirect(origin: string, message: string) {
  const url = new URL("/connectors", origin);
  url.searchParams.set("connect_error", message.slice(0, 240));
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const origin = resolveOAuthReturnOrigin(request);
  const connectorKey = request.nextUrl.searchParams.get("connector") as ConnectorKey | null;

  if (!connectorKey) {
    return connectorsErrorRedirect(origin, "Missing connector key.");
  }

  const def = getConnectorDefinition(connectorKey);
  if (!def?.oauth || !supportsDirectConnectorOAuth(connectorKey)) {
    return connectorsErrorRedirect(origin, "This connector does not support direct OAuth yet.");
  }

  if (def.availability === "coming_soon") {
    return connectorsErrorRedirect(origin, `${def.name} is coming soon.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", origin);
    login.searchParams.set("next", "/connectors");
    return NextResponse.redirect(login);
  }

  try {
    const redirectUri = getConnectorOAuthCallbackUrl(request);
    const payload = createConnectorOAuthState(connectorKey, user.id, redirectUri);
    const authorizeUrl =
      def.oauth.supabaseProvider === "azure"
        ? buildAzureAuthorizeUrl({
            scopes: def.oauth.scopes,
            redirectUri,
            state: payload.state,
          })
        : buildGoogleAuthorizeUrl({
            scopes: def.oauth.scopes,
            redirectUri,
            state: payload.state,
          });

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(CONNECTOR_OAUTH_STATE_COOKIE, encodeConnectorOAuthStateCookie(payload), {
      httpOnly: true,
      sameSite: "lax",
      secure: !origin.startsWith("http://localhost"),
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start connector OAuth.";
    console.error("[connector.oauth.start]", message);
    return connectorsErrorRedirect(origin, message);
  }
}
