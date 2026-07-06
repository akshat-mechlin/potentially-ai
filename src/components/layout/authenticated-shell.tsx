"use client";

import type { Profile } from "@/types";
import { AppLayout } from "./app-layout";

interface AuthenticatedShellProps {
  children: React.ReactNode;
  profile: Pick<Profile, "name" | "email" | "avatar_url"> | null;
}

export function AuthenticatedShell({ children, profile }: AuthenticatedShellProps) {
  return (
    <AppLayout
      userName={profile?.name ?? profile?.email ?? undefined}
      userAvatar={profile?.avatar_url}
    >
      {children}
    </AppLayout>
  );
}
