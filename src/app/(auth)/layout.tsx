import type { ReactNode } from "react";
import { AuthHashHandler } from "@/components/auth/auth-hash-handler";

/**
 * Blocks native GET auth submits and strips sensitive *query* params.
 * Hash tokens (access_token / refresh_token) are handled by AuthHashHandler —
 * do not strip them here or email verification sessions are lost.
 */
const AUTH_URL_GUARD_SCRIPT = `
(function () {
  var sensitive = ${JSON.stringify(
    [
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
    ],
  )};

  function stripSensitiveQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      var changed = false;
      sensitive.forEach(function (key) {
        if (params.has(key)) {
          params.delete(key);
          changed = true;
        }
      });
      if (!changed) return;
      var next = window.location.pathname;
      var rest = params.toString();
      if (rest) next += "?" + rest;
      if (window.location.hash) next += window.location.hash;
      window.history.replaceState(null, "", next);
    } catch (e) {}
  }

  document.addEventListener(
    "submit",
    function (e) {
      var form = e.target;
      if (form && form.tagName === "FORM" && form.hasAttribute("data-auth-form")) {
        e.preventDefault();
      }
    },
    true,
  );

  stripSensitiveQuery();
})();
`.trim();

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: AUTH_URL_GUARD_SCRIPT }} />
      <AuthHashHandler />
      {children}
    </>
  );
}
