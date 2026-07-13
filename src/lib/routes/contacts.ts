/** Contact profile path — flat route avoids nested client-params 404s in Next. */
export function contactHref(contactId: string, tab?: "outreach" | "overview" | "timeline") {
  const base = `/contact/${contactId}`;
  if (!tab || tab === "overview") return base;
  return `${base}?tab=${tab}`;
}
