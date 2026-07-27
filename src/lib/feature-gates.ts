import type { FeatureFlagKey, FeatureFlagsMap } from "@/lib/admin/feature-flags-catalog";
import type { NavItem } from "@/lib/nav-items";

/** Map primary nav hrefs to the flag that must be on for the item to show. */
export const NAV_FLAG_BY_HREF: Partial<Record<string, FeatureFlagKey>> = {
  "/search": "ai_search",
  "/network": "graph_view",
  "/analytics": "analytics",
  "/intros": "outreach_engine",
  "/groups": "team_collaboration",
};

export function filterNavByFlags(items: NavItem[], flags: FeatureFlagsMap | undefined): NavItem[] {
  if (!flags) {
    return items.filter((item) => !NAV_FLAG_BY_HREF[item.href]);
  }
  return items.filter((item) => {
    const flag = NAV_FLAG_BY_HREF[item.href];
    if (!flag) return true;
    return flags[flag] === true;
  });
}

export function isConnectorAllowedByFlags(
  connector: { key: string; category: string; availability: string },
  flags: FeatureFlagsMap | undefined,
): boolean {
  if (!flags) return false;

  if (
    connector.key === "csv" ||
    connector.key === "custom_data" ||
    connector.category === "csv" ||
    connector.category === "custom"
  ) {
    return flags.csv_import === true;
  }
  if (connector.key === "apollo" || connector.category === "sales_intelligence") {
    return flags.connector_apollo === true || flags.beta_connectors === true;
  }
  if (connector.category === "google" || connector.key.startsWith("google") || connector.key === "gmail") {
    return flags.google_sync === true;
  }
  if (
    connector.category === "microsoft" ||
    connector.key.startsWith("outlook")
  ) {
    return flags.outlook_sync === true;
  }
  if (connector.availability === "beta" || connector.availability === "coming_soon") {
    return flags.beta_connectors === true;
  }
  return true;
}
