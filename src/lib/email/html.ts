/** Escape text for safe interpolation into HTML email templates. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape then convert newlines to `<br>`. */
export function escapeHtmlWithBreaks(value: string): string {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br>");
}

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:1020";
}

export function buildSignupInviteUrl(email: string, redirectPath: string): string {
  const base = appBaseUrl();
  const path = redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`;
  return `${base}/signup?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(path)}`;
}
