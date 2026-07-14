"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { getClientAppOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell } from "@/components/layout/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

async function joinGroupFromInvite(invite: string) {
  const res = await fetch("/api/groups/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invite }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to join group");
  return data;
}

function LoginFormContent() {
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  const authError = searchParams.get("error");
  const verified = searchParams.get("verified");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (verified === "1") {
      toast.success("Email verified — finishing sign-in…");
      return;
    }
    if (authError === "auth") {
      toast.error("Sign-in failed. Check your credentials or try again.");
    }
  }, [authError, verified]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const finishLogin = async () => {
    if (invite) {
      try {
        const result = await joinGroupFromInvite(invite);
        toast.success(result.message || "Joined group");
        window.location.assign("/groups");
        return;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not join group");
      }
    }
    window.location.assign("/dashboard");
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        toast.success("Welcome back! (Demo mode)");
        await finishLogin();
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          ...(invite ? { invite } : {}),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Login failed");

      await finishLogin();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "azure") => {
    if (isDemoMode()) {
      toast.success(`Signed in with ${provider} (Demo mode)`);
      await finishLogin();
      return;
    }

    const origin = getClientAppOrigin();
    const supabase = createClient();
    const redirectTo = invite
      ? `${origin}/api/auth/callback?next=/groups&invite=${encodeURIComponent(invite)}`
      : `${origin}/api/auth/callback?next=/dashboard`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) throw error;
  };

  const handleMagicLink = async (email: string) => {
    if (isDemoMode()) {
      toast.success("Magic link sent! (Demo mode: redirecting)");
      await finishLogin();
      return;
    }

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...(invite ? { invite } : {}) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send magic link");
      toast.success(result.message || "Check your email for the magic link");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send magic link");
    }
  };

  return (
    <AuthShell step={1} totalSteps={1} stepLabel="Sign in">
      <CardHeader className="space-y-1 p-0 text-center">
        <CardTitle className="font-display text-2xl text-foreground">Welcome back</CardTitle>
        <CardDescription>
          {invite
            ? "Sign in to join the group you were invited to"
            : "Sign in to your relationship intelligence workspace"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-0 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => handleOAuth("google")}>
            Google
          </Button>
          <Button variant="outline" onClick={() => handleOAuth("azure")}>
            Microsoft
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <AuthForm onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </AuthForm>

        <Button
          variant="ghost"
          className="w-full text-sm"
          onClick={() => {
            const email = (document.getElementById("email") as HTMLInputElement)?.value;
            if (email) handleMagicLink(email);
            else toast.error("Enter your email first");
          }}
        >
          Send magic link instead
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={invite ? `/signup?invite=${encodeURIComponent(invite)}` : "/signup"}
            className="text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardContent>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginFormContent />
    </Suspense>
  );
}
