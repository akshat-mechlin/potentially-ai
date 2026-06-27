import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Search,
  Network,
  Handshake,
  Users,
  Building2,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  mobileTab?: boolean;
  moreMenu?: boolean;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard, mobileTab: true },
  { href: "/search", label: "Search", icon: Search, mobileTab: true },
  { href: "/contacts", label: "Contacts", icon: Users, mobileTab: true },
  { href: "/network", label: "Network", icon: Network, mobileTab: true },
  { href: "/intros", label: "Introductions", icon: Handshake, moreMenu: true },
  { href: "/workspace", label: "Workspace", icon: Building2, moreMenu: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, moreMenu: true },
  { href: "/settings", label: "Settings", icon: Settings, moreMenu: true },
];

export const mobileTabItems = navItems.filter((item) => item.mobileTab);
export const moreMenuItems = navItems.filter((item) => item.moreMenu);

export function getPageTitle(pathname: string): string {
  const match = navItems.find((item) => pathname.startsWith(item.href));
  if (match) return match.label;

  if (pathname.startsWith("/contacts/")) return "Contact";
  return "Potentially";
}
