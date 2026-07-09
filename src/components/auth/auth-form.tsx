"use client";

import type { FormEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthFormProps = {
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  className?: string;
};

/** Blocks native GET form submits before React hydrates (PWA / slow JS on tunnel). */
export function AuthForm({ onSubmit, children, className }: AuthFormProps) {
  return (
    <form
      data-auth-form=""
      noValidate
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
