"use client";

import type { FormEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthFormProps = {
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  className?: string;
};

/**
 * Auth forms must never use GET — native submits put email/password in the query string.
 * method="post" is the backstop if JS is slow or blocked; onSubmit always prevents default.
 */
export function AuthForm({ onSubmit, children, className }: AuthFormProps) {
  return (
    <form
      data-auth-form=""
      method="post"
      action=""
      noValidate
      autoComplete="on"
      className={cn(className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(event);
      }}
    >
      {children}
    </form>
  );
}
