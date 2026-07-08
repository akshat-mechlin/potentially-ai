export interface MobileBackLink {
  href: string;
}

export function getMobileBackLink(pathname: string): MobileBackLink | null {
  const prospectMatch = pathname.match(/^\/playbooks\/([^/]+)\/prospects\/[^/]+$/);
  if (prospectMatch) {
    return { href: `/playbooks/${prospectMatch[1]}/runs` };
  }

  const flatRunMatch = pathname.match(/^\/playbook-runs\/([^/]+)$/);
  if (flatRunMatch) {
    return { href: "/playbooks" };
  }

  const legacyRunMatch = pathname.match(/^\/playbooks\/([^/]+)\/runs\/([^/]+)$/);
  if (legacyRunMatch) {
    return { href: `/playbooks/${legacyRunMatch[1]}/runs` };
  }

  const playbookSubMatch = pathname.match(
    /^\/playbooks\/([^/]+)\/(runs|settings|sequence|templates|audit)$/,
  );
  if (playbookSubMatch) {
    return { href: `/playbooks/${playbookSubMatch[1]}` };
  }

  const playbookMatch = pathname.match(/^\/playbooks\/([^/]+)$/);
  if (playbookMatch) {
    return { href: "/playbooks" };
  }

  const contactMatch = pathname.match(/^\/contacts\/([^/]+)$/);
  if (contactMatch) {
    return { href: "/contacts" };
  }

  const segmentMatch = pathname.match(/^\/segments\/([^/]+)$/);
  if (segmentMatch) {
    return { href: "/segments" };
  }

  const groupMatch = pathname.match(/^\/groups\/([^/]+)$/);
  if (groupMatch) {
    return { href: "/groups" };
  }

  const chatMatch = pathname.match(/^\/chats\/([^/]+)$/);
  if (chatMatch) {
    return { href: "/chats" };
  }

  return null;
}

/** Full-screen mobile flows: hide tab bar and use edge-to-edge layout. */
export function isImmersiveMobileRoute(pathname: string): boolean {
  return (
    pathname.includes("/prospects/") ||
    pathname.match(/^\/playbook-runs\/[^/]+$/) !== null ||
    pathname.match(/^\/playbooks\/[^/]+\/runs\/[^/]+$/) !== null ||
    pathname.match(/^\/chats\/[^/]+$/) !== null
  );
}

/** Hide the global app bar — screen provides its own native header. */
export function shouldHideAppHeader(pathname: string): boolean {
  return pathname.includes("/prospects/") || pathname.match(/^\/chats\/[^/]+$/) !== null;
}
