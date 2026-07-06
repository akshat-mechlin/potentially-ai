"use client";

import Link from "next/link";
import { AlertCircle, ExternalLink } from "lucide-react";
import { getSupabaseProvidersUrl } from "@/lib/oauth/errors";
import { Card, CardContent } from "@/components/ui/card";

export function ConnectorSetupBanner() {
  const providersUrl = getSupabaseProvidersUrl();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex gap-3 p-4 sm:p-5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">OAuth providers must be enabled in Supabase</p>
          <p className="text-muted-foreground">
            Connector sign-in uses Supabase Auth. If you see &quot;provider is not enabled&quot;,
            configure each provider in your Supabase project before connecting.
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
                Supabase → Authentication → Providers
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </li>
            <li>Enable the provider (Google, Azure, GitHub, etc.) and paste OAuth client ID + secret</li>
            <li>
              Under URL Configuration, add redirect URL:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{appUrl}/api/auth/callback</code>
            </li>
            <li>
              For multiple accounts per platform, enable{" "}
              <strong className="font-medium text-foreground">Manual linking</strong> in Authentication
              → Settings
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Google Contacts also requires the People API enabled in Google Cloud Console. Outlook
            requires <code className="rounded bg-muted px-1">Contacts.Read</code> in your Azure app.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
