"use client";

import type { ReactNode } from "react";
import { AppLayout } from "./app-layout";
import { useProfile } from "@/hooks/use-profile";

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();

  return (
    <AppLayout
      userName={profile?.name ?? profile?.email ?? undefined}
      userAvatar={profile?.avatar_url}
    >
      {children}
    </AppLayout>
  );
}
