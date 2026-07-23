"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/stores";
import { agentModeCoreItems, agentModeNav, agentModeWorkflowItem, moreMenuItems, resourcesNav } from "@/lib/nav-items";
import { useFeatureFlags, usePlaybookEnabled } from "@/hooks/use-feature-flags";
import { filterNavByFlags } from "@/lib/feature-gates";
import {
  MobileBottomSheet,
  MobileListSection,
  MobileListTile,
} from "@/components/mobile/native-ui";
import { UnreadCountBadge } from "@/components/support/unread-badge";

export function MobileMoreSheet() {
  const pathname = usePathname();
  const { mobileMoreOpen, setMobileMoreOpen } = useUIStore();
  const { enabled: agentModeEnabled } = usePlaybookEnabled();
  const { data: flags } = useFeatureFlags();
  const visibleMoreItems = filterNavByFlags(moreMenuItems, flags);

  const { data: supportUnreadData } = useQuery({
    queryKey: ["support-unread"],
    queryFn: async () => {
      const res = await fetch("/api/support/unread");
      if (res.status === 403) return { unread: 0 };
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");
      return body as { unread: number };
    },
    enabled: mobileMoreOpen && flags?.support_ticketing !== false,
    refetchInterval: mobileMoreOpen ? 30_000 : false,
  });
  const supportUnread = supportUnreadData?.unread ?? 0;

  const close = () => setMobileMoreOpen(false);

  return (
    <MobileBottomSheet open={mobileMoreOpen} onOpenChange={setMobileMoreOpen} title="More">
      <div className="space-y-4 p-4">
        {agentModeEnabled && (
          <MobileListSection title={agentModeNav.label}>
            {agentModeCoreItems.map((item) => (
              <MobileListTile
                key={item.href}
                href={item.href}
                icon={item.icon}
                title={item.label}
                iconMuted={!pathname.startsWith(item.href)}
                onClick={close}
              />
            ))}
            <MobileListTile
              href={agentModeWorkflowItem.href}
              icon={agentModeWorkflowItem.icon}
              title={agentModeWorkflowItem.label}
              iconMuted={!pathname.startsWith(agentModeWorkflowItem.href)}
              onClick={close}
            />
          </MobileListSection>
        )}

        <MobileListSection title={resourcesNav.label}>
          {resourcesNav.items.map((item) => (
            <MobileListTile
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.label}
              trailing={
                item.href === "/support" ? <UnreadCountBadge count={supportUnread} /> : undefined
              }
              iconMuted={!(pathname === item.href || pathname.startsWith(`${item.href}/`))}
              onClick={close}
            />
          ))}
        </MobileListSection>

        <MobileListSection title="Menu">
          {visibleMoreItems.map((item) => (
            <MobileListTile
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.label}
              iconMuted={!pathname.startsWith(item.href)}
              onClick={close}
            />
          ))}
        </MobileListSection>
      </div>
    </MobileBottomSheet>
  );
}
