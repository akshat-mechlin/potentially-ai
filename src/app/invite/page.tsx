"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell } from "@/components/layout/auth-shell";
import { toast } from "sonner";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? searchParams.get("invite");
  const [loading, setLoading] = useState(() => Boolean(token));
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    const run = async () => {
      if (isDemoMode()) {
        toast.success("Joined group (demo mode)");
        router.replace("/dashboard");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setJoining(true);
      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invite: token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to join group");
        toast.success(data.message || "Joined group");
        router.replace("/groups");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to join group");
        setLoading(false);
        setJoining(false);
      }
    };

    void run();
  }, [token, router]);

  if (!token) {
    return (
      <CardContent className="space-y-4 p-0 pt-6 text-center">
        <p className="text-sm text-muted-foreground">This invite link is missing a token.</p>
        <Button asChild>
          <Link href="/login">Go to sign in</Link>
        </Button>
      </CardContent>
    );
  }

  if (loading || joining) {
    return (
      <CardContent className="flex flex-col items-center gap-3 p-0 pt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {joining ? "Joining group..." : "Checking your invite..."}
        </p>
      </CardContent>
    );
  }

  return (
    <CardContent className="space-y-4 p-0 pt-6 text-center">
      <p className="text-sm text-muted-foreground">
        Sign in or create an account to join this group.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href={`/login?invite=${encodeURIComponent(token)}`}>Sign in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/signup?invite=${encodeURIComponent(token)}`}>Create account</Link>
        </Button>
      </div>
    </CardContent>
  );
}

export default function InvitePage() {
  return (
    <AuthShell step={1} totalSteps={1} stepLabel="Invite">
      <CardHeader className="space-y-1 p-0 text-center">
        <CardTitle className="font-display text-2xl text-foreground">You&apos;re invited</CardTitle>
        <CardDescription>Join a group on Potentially.ai</CardDescription>
      </CardHeader>
      <Suspense
        fallback={
          <CardContent className="flex justify-center p-0 pt-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        }
      >
        <InviteContent />
      </Suspense>
    </AuthShell>
  );
}
