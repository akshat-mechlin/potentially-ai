"use client";

import Link from "next/link";
import { AlertCircle, ExternalLink } from "lucide-react";
import { getSupabaseProvidersUrl } from "@/lib/oauth/errors";
import { getConnectorOAuthCallbackAllowlistUrls } from "@/lib/oauth/connector-oauth";
import { getOAuthCallbackAllowlistUrls } from "@/lib/oauth/scopes";
import { Card, CardContent } from "@/components/ui/card";

export function ConnectorSetupBanner() {
  const providersUrl = getSupabaseProvidersUrl();
  const loginAllowlistUrls = getOAuthCallbackAllowlistUrls();
  const connectorCallbackUrls = getConnectorOAuthCallbackAllowlistUrls();

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex gap-3 p-4 sm:p-5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-foreground">OAuth setup for Google &amp; Microsoft</p>
            <p className="text-muted-foreground">
              Live connectors: Google Contacts, Calendar, Gmail, Outlook Contacts, and{" "}
              <strong className="font-medium text-foreground">Outlook Email</strong>. Connectors use
              direct OAuth (tokens on your workspace) so a mailbox can be connected even if that
              Google/Microsoft login already belongs to another Potentially user.
            </p>
          </div>

          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              Create Google / Azure OAuth clients and paste client ID + secret into{" "}
              <code className="rounded bg-muted px-1">.env</code> as{" "}
              <code className="rounded bg-muted px-1">GOOGLE_OAUTH_*</code> /{" "}
              <code className="rounded bg-muted px-1">AZURE_OAUTH_*</code>
            </li>
            <li>
              On each OAuth app, add these <strong className="font-medium text-foreground">
                connector
              </strong>{" "}
              redirect URIs (Web):
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {connectorCallbackUrls.map((url) => (
                  <li key={url}>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{url}</code>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              For{" "}
              <strong className="font-medium text-foreground">Sign in with Google/Microsoft</strong>{" "}
              only, also enable providers in{" "}
              <Link
                href={providersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                Supabase → Authentication → Providers
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>{" "}
              and allowlist:
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {loginAllowlistUrls.map((url) => (
                  <li key={url}>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{url}</code>
                  </li>
                ))}
              </ul>
            </li>
          </ol>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <strong className="font-medium text-foreground">Apollo OAuth:</strong> register
              Potentially in Apollo under Settings → Integrations → API Keys → OAuth registration.
              Add the connector callback URL below and set{" "}
              <code className="rounded bg-muted px-1">APOLLO_OAUTH_CLIENT_ID</code> /{" "}
              <code className="rounded bg-muted px-1">APOLLO_OAUTH_CLIENT_SECRET</code> in{" "}
              <code className="rounded bg-muted px-1">.env</code>. Users need permission to
              authorize third-party OAuth apps in Apollo.
            </p>
            <p>
              <strong className="font-medium text-foreground">Google Cloud:</strong> enable People,
              Calendar, and Gmail APIs; add those scopes on the consent screen.
            </p>
            <p>
              <strong className="font-medium text-foreground">Microsoft Azure AD app:</strong> add
              delegated permissions{" "}
              <code className="rounded bg-muted px-1">User.Read</code> (required),{" "}
              <code className="rounded bg-muted px-1">email</code>,{" "}
              <code className="rounded bg-muted px-1">openid</code>,{" "}
              <code className="rounded bg-muted px-1">profile</code>,{" "}
              <code className="rounded bg-muted px-1">offline_access</code>,{" "}
              <code className="rounded bg-muted px-1">Contacts.Read</code>, and{" "}
              <code className="rounded bg-muted px-1">Mail.Read</code> (Outlook Email). Grant{" "}
              <strong className="font-medium text-foreground">admin consent</strong> for the
              tenant. Keep the Supabase redirect URI for login, and add the connector callback
              above for Connect.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
