export interface MobileBackLink {
  href: string;
}

export function getMobileBackLink(pathname: string): MobileBackLink | null {
  const prospectMatch = pathname.match(/^\/playbooks\/([^/]+)\/prospects\/[^/]+$/);
  if (prospectMatch) {
    return { href: `/playbooks/${prospectMatch[1]}/runs` };
  }

  const runMatch = pathname.match(/^\/playbooks\/([^/]+)\/runs\/([^/]+)$/);
  if (runMatch) {
    return { href: `/playbooks/${runMatch[1]}/runs` };
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

  return null;
}

/** Full-screen mobile flows: hide tab bar and use edge-to-edge layout. */
export function isImmersiveMobileRoute(pathname: string): boolean {
  return (
    pathname.includes("/prospects/") ||
    pathname.match(/^\/playbooks\/[^/]+\/runs\/[^/]+$/) !== null
  );
}

/** Hide the global app bar — screen provides its own native header. */
export function shouldHideAppHeader(pathname: string): boolean {
  return pathname.includes("/prospects/");
}
