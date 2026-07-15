import { NextResponse, type NextRequest } from "next/server";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import type { ConnectorKey } from "@/lib/connectors/types";
import { saveConnectorOAuthTokens, syncConnector } from "@/lib/data/connectors";
import { resolveOAuthReturnOrigin } from "@/lib/app-url";
import {
  CONNECTOR_OAUTH_STATE_COOKIE,
  decodeConnectorOAuthStateCookie,
  exchangeAzureAuthorizationCode,
  exchangeGoogleAuthorizationCode,
  fetchAzureAccountProfile,
  fetchGoogleAccountProfile,
} from "@/lib/oauth/connector-oauth";
import { createClient } from "@/lib/supabase/server";

function clearStateCookie(response: NextResponse) {
  response.cookies.set(CONNECTOR_OAUTH_STATE_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });
}

function connectorsRedirect(
  origin: string,
  params: Record<string, string>,
) {
  const url = new URL("/connectors", origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url);
  clearStateCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  const origin = resolveOAuthReturnOrigin(request);
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  const payload = decodeConnectorOAuthStateCookie(
    request.cookies.get(CONNECTOR_OAUTH_STATE_COOKIE)?.value,
  );

  if (oauthError) {
    const description = oauthErrorDescription
      ? decodeURIComponent(oauthErrorDescription.replace(/\+/g, " "))
      : oauthError;
    console.error("[connector.oauth.callback] provider error", {
      oauthError,
      description,
      connectorKey: payload?.connectorKey ?? null,
    });
    return connectorsRedirect(origin, {
      connect_error: description.slice(0, 240),
    });
  }

  if (!payload || !state || payload.state !== state) {
    return connectorsRedirect(origin, {
      connect_error: "OAuth session expired or was invalid. Click Connect again.",
    });
  }

  if (!code) {
    return connectorsRedirect(origin, {
      connect_error: "Provider did not return an authorization code. Try Connect again.",
    });
  }

  const connectorKey = payload.connectorKey as ConnectorKey;
  const def = getConnectorDefinition(connectorKey);
  if (!def?.oauth) {
    return connectorsRedirect(origin, {
      connect_error: "Unknown connector after OAuth.",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== payload.userId) {
    const login = new URL("/login", origin);
    login.searchParams.set("next", "/connectors");
    login.searchParams.set("error", "auth");
    login.searchParams.set(
      "error_description",
      "Sign in again, then reconnect the connector.",
    );
    const response = NextResponse.redirect(login);
    clearStateCookie(response);
    return response;
  }

  try {
    const tokens =
      def.oauth.supabaseProvider === "azure"
        ? await exchangeAzureAuthorizationCode({
            code,
            redirectUri: payload.redirectUri,
            scopes: def.oauth.scopes,
          })
        : await exchangeGoogleAuthorizationCode({
            code,
            redirectUri: payload.redirectUri,
          });

    const profile =
      def.oauth.supabaseProvider === "azure"
        ? await fetchAzureAccountProfile(tokens.accessToken, tokens.idToken)
        : await fetchGoogleAccountProfile(tokens.accessToken);

    await saveConnectorOAuthTokens(supabase, {
      connectorKey,
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      providerAccountId: profile.providerAccountId,
      accountEmail: profile.accountEmail,
      accountLabel: profile.accountLabel,
      metadata: { flow: "direct_connector_oauth" },
    });

    let synced = false;
    if (
      def.syncSource === "google_contacts" ||
      def.syncSource === "google_calendar" ||
      def.syncSource === "gmail" ||
      def.syncSource === "outlook" ||
      def.syncSource === "outlook_mail"
    ) {
      try {
        await syncConnector(connectorKey, undefined, supabase);
        synced = true;
      } catch (syncError) {
        console.error("[connector.oauth.callback] sync failed", syncError);
        const syncMessage =
          syncError instanceof Error ? syncError.message : "Sync failed after connect";
        return connectorsRedirect(origin, {
          connected: connectorKey,
          sync_error: syncMessage.slice(0, 180),
        });
      }
    }

    return connectorsRedirect(origin, {
      connected: connectorKey,
      ...(synced ? { synced: "1" } : {}),
    });
  } catch (error) {
    console.error("[connector.oauth.callback]", error);
    const message = error instanceof Error ? error.message : "Connection failed.";
    return connectorsRedirect(origin, {
      connect_error: message.slice(0, 240),
    });
  }
}
