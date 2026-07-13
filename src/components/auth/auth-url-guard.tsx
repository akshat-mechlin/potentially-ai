"use client";

import { useEffect } from "react";

const SENSITIVE_QUERY_KEYS = [
  "password",
  "confirmPassword",
  "confirm_password",
  "new_password",
  "newPassword",
  "current_password",
  "currentPassword",
  "email",
  "name",
  "full_name",
  "fullName",
  "apikey",
  "api_key",
  "secret",
  "authorization",
  "credentials",
] as const;

function stripSensitiveQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    for (const key of SENSITIVE_QUERY_KEYS) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    let next = window.location.pathname;
    const rest = params.toString();
    if (rest) next += `?${rest}`;
    if (window.location.hash) next += window.location.hash;
    window.history.replaceState(null, "", next);
  } catch {
    // ignore
  }
}

/**
 * Blocks native GET auth submits and strips sensitive *query* params.
 * Hash tokens stay for AuthHashHandler.
 */
export function AuthUrlGuard() {
  useEffect(() => {
    stripSensitiveQuery();

    const onSubmit = (e: Event) => {
      const form = e.target;
      if (
        form instanceof HTMLFormElement &&
        form.hasAttribute("data-auth-form")
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  return null;
}
