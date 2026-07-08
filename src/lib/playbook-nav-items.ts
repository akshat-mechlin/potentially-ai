import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  History,
  Settings,
  GitBranch,
  Mail,
  ScrollText,
} from "lucide-react";

export interface PlaybookNavItem {
  segment: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export function playbookNavItems(playbookId: string): PlaybookNavItem[] {
  const base = `/playbooks/${playbookId}`;
  // Workflow order: configure → message → follow-ups → execute → review
  return [
    { segment: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { segment: `${base}/settings`, label: "Settings", icon: Settings },
    { segment: `${base}/templates`, label: "Templates", icon: Mail },
    { segment: `${base}/sequence`, label: "Sequence", icon: GitBranch },
    { segment: `${base}/runs`, label: "Runs", icon: History },
    { segment: `${base}/audit`, label: "Audit", icon: ScrollText },
  ];
}

export function isPlaybookNavActive(pathname: string, item: PlaybookNavItem) {
  if (item.exact) return pathname === item.segment;
  if (item.label === "Runs") {
    return (
      pathname === item.segment ||
      pathname.startsWith(`${item.segment}/`) ||
      pathname.startsWith("/playbook-runs/")
    );
  }
  return pathname === item.segment || pathname.startsWith(`${item.segment}/`);
}

export function getPlaybookPageTitle(pathname: string): string | null {
  if (pathname.includes("/prospects/")) return "Prospect";
  if (pathname.startsWith("/playbook-runs/")) return "Run";
  if (pathname.includes("/runs/")) return "Run";
  if (pathname.endsWith("/runs")) return "Runs";
  if (pathname.endsWith("/settings")) return "Settings";
  if (pathname.endsWith("/sequence")) return "Sequence";
  if (pathname.endsWith("/templates")) return "Templates";
  if (pathname.endsWith("/audit")) return "Audit";
  if (/^\/playbooks\/[^/]+$/.test(pathname)) return "Playbook";
  return null;
}
