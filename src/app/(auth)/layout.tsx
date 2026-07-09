import type { ReactNode } from "react";

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
      "access_token",
      "refresh_token",
      "id_token",
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
      window.history.replaceState(null, "", next);
    } catch (e) {}
  }

  function stripSessionHash() {
    try {
      var hash = window.location.hash || "";
      var lower = hash.toLowerCase();
      if (
        lower.indexOf("access_token=") !== -1 ||
        lower.indexOf("refresh_token=") !== -1 ||
        lower.indexOf("id_token=") !== -1 ||
        lower.indexOf("provider_token=") !== -1
      ) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
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
  stripSessionHash();
})();
`.trim();

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: AUTH_URL_GUARD_SCRIPT }} />
      {children}
    </>
  );
}
