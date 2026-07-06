"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { InteractiveMenu, type InteractiveMenuItem } from "@/components/ui/modern-mobile-menu";
import { isAgentModePath, mobileTabItems, moreMenuItems } from "@/lib/nav-items";
import { useUIStore } from "@/stores";

interface MobileTabBarProps {
  hidden?: boolean;
}

export function MobileTabBar({ hidden }: MobileTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileMoreOpen, setMobileMoreOpen } = useUIStore();

  const isMoreActive =
    isAgentModePath(pathname) ||
    moreMenuItems.some((item) => pathname.startsWith(item.href));

  const menuItems = useMemo<InteractiveMenuItem[]>(
    () => [
      ...mobileTabItems.map((item) => ({
        label: (item.shortLabel ?? item.label).toLowerCase(),
        icon: item.icon,
      })),
      { label: "more", icon: MoreHorizontal },
    ],
    [],
  );

  const activeIndex = useMemo(() => {
    const tabIndex = mobileTabItems.findIndex((item) => pathname.startsWith(item.href));
    if (tabIndex >= 0) return tabIndex;
    if (isMoreActive) return menuItems.length - 1;
    return 0;
  }, [isMoreActive, menuItems.length, pathname]);

  const handleItemClick = (index: number) => {
    if (index === menuItems.length - 1) {
      setMobileMoreOpen(!mobileMoreOpen);
      return;
    }

    const item = mobileTabItems[index];
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
        accentColor="var(--primary)"
      />
    </div>
  );
}
