/** Client-safe helpers for contact exclusion metadata. */

export type ContactExcludedStatus = "active" | "excluded" | "all";

export function isContactExcluded(contact: {
  metadata?: Record<string, unknown> | null;
}): boolean {
  return contact.metadata?.excluded === true;
}
