"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { InteractiveMenu, type InteractiveMenuItem } from "@/components/ui/modern-mobile-menu";
import { isAgentModePath, mobileTabItems, moreMenuItems } from "@/lib/nav-items";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { filterNavByFlags } from "@/lib/feature-gates";
import { useUIStore } from "@/stores";

interface MobileTabBarProps {
  hidden?: boolean;
}

export function MobileTabBar({ hidden }: MobileTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileMoreOpen, setMobileMoreOpen } = useUIStore();
  const { data: flags } = useFeatureFlags();
  const visibleTabs = useMemo(() => filterNavByFlags(mobileTabItems, flags), [flags]);
  const visibleMore = useMemo(() => filterNavByFlags(moreMenuItems, flags), [flags]);

  const isMoreActive =
    isAgentModePath(pathname) ||
    visibleMore.some((item) => pathname.startsWith(item.href));

  const menuItems = useMemo<InteractiveMenuItem[]>(
    () => [
      ...visibleTabs.map((item) => ({
        label: (item.shortLabel ?? item.label).toLowerCase(),
        icon: item.icon,
      })),
      { label: "more", icon: MoreHorizontal },
    ],
    [visibleTabs],
  );

  const activeIndex = useMemo(() => {
    const tabIndex = visibleTabs.findIndex((item) => pathname.startsWith(item.href));
    if (tabIndex >= 0) return tabIndex;
    if (isMoreActive) return menuItems.length - 1;
    return 0;
  }, [isMoreActive, menuItems.length, pathname, visibleTabs]);

  const handleItemClick = (index: number) => {
    if (index === menuItems.length - 1) {
      setMobileMoreOpen(!mobileMoreOpen);
      return;
    }

    const item = visibleTabs[index];
    if (item) {
      router.push(item.href);
    }
  };

  if (hidden) return null;

  return (
    <div className="mobile-tab-bar fixed inset-x-0 bottom-0 z-50 lg:hidden">
      <InteractiveMenu
        items={menuItems}
        activeIndex={activeIndex}
        onItemClick={handleItemClick}
      />
    </div>
  );
}
