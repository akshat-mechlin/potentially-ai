"use client";

import { usePathname } from "next/navigation";
import { useUIStore } from "@/stores";
import { agentModeNav, moreMenuItems } from "@/lib/nav-items";
import { usePlaybookEnabled } from "@/hooks/use-feature-flags";
import {
  MobileBottomSheet,
  MobileListSection,
  MobileListTile,
} from "@/components/mobile/native-ui";

export function MobileMoreSheet() {
  const pathname = usePathname();
  const { mobileMoreOpen, setMobileMoreOpen } = useUIStore();
  const { enabled: agentModeEnabled } = usePlaybookEnabled();

  const close = () => setMobileMoreOpen(false);

  return (
    <MobileBottomSheet open={mobileMoreOpen} onOpenChange={setMobileMoreOpen} title="More">
      <div className="space-y-4 p-4">
        {agentModeEnabled && (
          <MobileListSection title={agentModeNav.label}>
            {agentModeNav.items.map((item) => (
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
        )}

        <MobileListSection title="Menu">
          {moreMenuItems.map((item) => (
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
