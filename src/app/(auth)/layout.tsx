import type { ReactNode } from "react";
import { AuthHashHandler } from "@/components/auth/auth-hash-handler";
import { AuthUrlGuard } from "@/components/auth/auth-url-guard";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthUrlGuard />
      <AuthHashHandler />
      {children}
    </>
  );
}
