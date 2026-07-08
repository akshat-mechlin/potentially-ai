import type { LucideIcon } from "lucide-react";
import { getPlaybookPageTitle } from "@/lib/playbook-nav-items";
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
}

/** Agent Mode (Playbooks pipeline) — shown indented under its own sidebar section */
export const agentModeNav = {
  label: "Agent Mode",
  items: [
    { href: "/playbooks", label: "Playbooks", icon: BookOpen },
    { href: "/segments", label: "Segments", icon: ListFilter },
    { href: "/chats", label: "Chats", icon: MessageSquare },
  ] satisfies AgentModeNavItem[],
};

export const agentModePaths = agentModeNav.items.map((item) => item.href);

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

export function getPageTitle(pathname: string): string {
  const agentMatch = agentModeNav.items.find((item) => pathname.startsWith(item.href));
  if (agentMatch) {
    const playbookTitle = getPlaybookPageTitle(pathname);
    if (playbookTitle) return playbookTitle;
    if (pathname.startsWith("/chats/")) return "Chat";
    return agentMatch.label;
  }

  const match = navItems.find((item) => pathname.startsWith(item.href));
  if (match) return match.label;

  if (pathname.startsWith("/contacts/")) return "Contact";
  if (pathname.startsWith("/segments/")) return "Segment";
  return "Potentially";
}
