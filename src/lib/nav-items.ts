import type { LucideIcon } from "lucide-react";
import { getPlaybookPageTitle } from "@/lib/playbook-nav-items";
import { getDocTitle } from "@/lib/docs/catalog";
import {
  LayoutDashboard,
  Search,
  Network,
  Handshake,
  Users,
  Building2,
  BarChart3,
  Settings,
  Cable,
  BookOpen,
  ListFilter,
  MessageSquare,
  Library,
  Workflow,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  mobileTab?: boolean;
  moreMenu?: boolean;
}

export interface AgentModeNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

/** Core Agent Mode modules (segments → playbooks → chats). */
export const agentModeCoreItems = [
  { href: "/segments", label: "Segments", icon: ListFilter },
  { href: "/playbooks", label: "Playbooks", icon: BookOpen },
  { href: "/chats", label: "Chats", icon: MessageSquare },
] satisfies AgentModeNavItem[];

/** Separated from the core three — still under Agent Mode. */
export const agentModeWorkflowItem = {
  href: "/workflows",
  label: "Workflows",
  icon: Workflow,
  comingSoon: true,
} satisfies AgentModeNavItem;

/** Agent Mode (Playbooks pipeline). Shown indented under its own sidebar section. */
export const agentModeNav = {
  label: "Agent Mode",
  items: [...agentModeCoreItems, agentModeWorkflowItem],
};

export const agentModePaths = agentModeNav.items.map((item) => item.href);

/** Resources section in the app sidebar. */
export const resourcesNav = {
  label: "Resources",
  items: [
    { href: "/docs", label: "Documentation", icon: Library },
  ] satisfies AgentModeNavItem[],
};

export const resourcesPaths = resourcesNav.items.map((item) => item.href);

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard, mobileTab: true },
  { href: "/search", label: "Search", icon: Search, mobileTab: true },
  { href: "/contacts", label: "Contacts", icon: Users, mobileTab: true },
  { href: "/network", label: "Network", icon: Network, mobileTab: true },
  { href: "/connectors", label: "Connectors", icon: Cable, moreMenu: true },
  { href: "/intros", label: "Introductions", icon: Handshake, moreMenu: true },
  { href: "/groups", label: "Groups", icon: Building2, moreMenu: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, moreMenu: true },
  { href: "/settings", label: "Settings", icon: Settings, moreMenu: true },
];

export const mobileTabItems = navItems.filter((item) => item.mobileTab);
export const moreMenuItems = navItems.filter((item) => item.moreMenu);

export function isAgentModePath(pathname: string) {
  return agentModePaths.some((path) => pathname.startsWith(path));
}

export function isResourcesPath(pathname: string) {
  return pathname === "/docs" || pathname.startsWith("/docs/");
}

export function getPageTitle(pathname: string): string {
  if (isResourcesPath(pathname)) {
    if (pathname === "/docs" || pathname === "/docs/") return "Documentation";
    const slug = pathname.split("/").filter(Boolean)[1];
    if (slug) return getDocTitle(slug) ?? "Documentation";
    return "Documentation";
  }

  const agentMatch = agentModeNav.items.find((item) => pathname.startsWith(item.href));
  if (agentMatch) {
    const playbookTitle = getPlaybookPageTitle(pathname);
    if (playbookTitle) return playbookTitle;
    if (pathname.startsWith("/chats/")) return "Chat";
    if (pathname.startsWith("/workflows/")) return "Workflow";
    return agentMatch.label;
  }

  const match = navItems.find((item) => pathname.startsWith(item.href));
  if (match) return match.label;

  if (pathname.startsWith("/contacts/")) return "Contact";
  if (pathname.startsWith("/segments/")) return "Segment";
  return "Potentially";
}
