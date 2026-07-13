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
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Google OAuth must be enabled in Supabase</p>
          <p className="text-muted-foreground">
            Right now only <strong className="font-medium text-foreground">Google Contacts</strong>{" "}
            Connect is live. Configure the Google provider in your Supabase project before connecting.
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              Open{" "}
              <Link
                href={providersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                Supabase → Authentication → Providers → Google
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </li>
            <li>Enable Google and paste the OAuth client ID + secret from Google Cloud Console</li>
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
          <p className="text-xs text-muted-foreground">
            Also enable the People API in Google Cloud Console. Optional: add{" "}
            <code className="rounded bg-muted px-1">GOOGLE_OAUTH_CLIENT_ID</code> and{" "}
            <code className="rounded bg-muted px-1">GOOGLE_OAUTH_CLIENT_SECRET</code> to .env (same
            values as Supabase) so expired tokens can refresh without reconnecting.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
