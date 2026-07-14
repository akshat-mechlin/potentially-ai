"use client";

import Link from "next/link";
import { AlertCircle, ExternalLink } from "lucide-react";
import { getSupabaseProvidersUrl } from "@/lib/oauth/errors";
import { getOAuthCallbackAllowlistUrls } from "@/lib/oauth/scopes";
import { Card, CardContent } from "@/components/ui/card";

export function ConnectorSetupBanner() {
  const providersUrl = getSupabaseProvidersUrl();
  const allowlistUrls = getOAuthCallbackAllowlistUrls();

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex gap-3 p-4 sm:p-5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-foreground">OAuth setup for Google &amp; Microsoft</p>
            <p className="text-muted-foreground">
              Live connectors: Google Contacts, Calendar, Gmail, and{" "}
              <strong className="font-medium text-foreground">Outlook Contacts</strong>. Enable each
              provider in Supabase before connecting.
            </p>
          </div>

          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              Open{" "}
              <Link
                href={providersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                Supabase → Authentication → Providers
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </li>
            <li>
              Enable <strong className="font-medium text-foreground">Google</strong> and/or{" "}
              <strong className="font-medium text-foreground">Azure (Microsoft)</strong> and paste the
              matching OAuth client ID + secret
            </li>
            <li>
              Under URL Configuration, add these redirect URLs:
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {allowlistUrls.map((url) => (
                  <li key={url}>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{url}</code>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              Enable{" "}
              <strong className="font-medium text-foreground">Manual linking</strong> so Connect works
              while you are already signed in
            </li>
          </ol>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <strong className="font-medium text-foreground">Google Cloud:</strong> enable People,
              Calendar, and Gmail APIs; add those scopes on the consent screen. Optional refresh
              vars: <code className="rounded bg-muted px-1">GOOGLE_OAUTH_CLIENT_ID</code> /{" "}
              <code className="rounded bg-muted px-1">GOOGLE_OAUTH_CLIENT_SECRET</code>.
            </p>
            <p>
              <strong className="font-medium text-foreground">Microsoft Azure AD app:</strong> add
              delegated permissions{" "}
              <code className="rounded bg-muted px-1">User.Read</code>,{" "}
              <code className="rounded bg-muted px-1">email</code>,{" "}
              <code className="rounded bg-muted px-1">openid</code>,{" "}
              <code className="rounded bg-muted px-1">profile</code>,{" "}
              <code className="rounded bg-muted px-1">offline_access</code>, and{" "}
              <code className="rounded bg-muted px-1">Contacts.Read</code> (for Outlook Contacts).
              Grant admin consent if required. Under{" "}
              <strong className="font-medium text-foreground">Token configuration</strong>, add
              optional claims <code className="rounded bg-muted px-1">email</code> and{" "}
              <code className="rounded bg-muted px-1">xms_edov</code> on the ID token. Redirect URI:{" "}
              <code className="rounded bg-muted px-1">
                https://&lt;project-ref&gt;.supabase.co/auth/v1/callback
              </code>
              . Optional refresh vars:{" "}
              <code className="rounded bg-muted px-1">AZURE_OAUTH_CLIENT_ID</code> /{" "}
              <code className="rounded bg-muted px-1">AZURE_OAUTH_CLIENT_SECRET</code> /{" "}
              <code className="rounded bg-muted px-1">AZURE_OAUTH_TENANT=common</code>.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
