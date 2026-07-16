"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { InfoHint } from "@/components/playbooks/field-hint";
import { cn } from "@/lib/utils";

export {
  MobileScreen,
  MobileLargeTitle,
  MobilePressable,
  MobileListSection,
  MobileListTile,
  MobileSwitchRow,
  MobileSearchBar,
  MobileChip,
  MobileChipRow,
  MobileAvatarTile,
  MobileBottomSheet,
  MobileEmptyState,
} from "./native-ui";

export const MOBILE_BOTTOM_SHEET =
  "mobile-more-sheet inset-x-0 bottom-0 top-auto left-0 right-0 max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl border-b-0 p-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 sm:inset-x-auto sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95";

export function DesktopOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("desktop-only", className)}>{children}</div>;
}

export function MobileOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mobile-only", className)}>{children}</div>;
}

export function MobileSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mobile-section-label">{children}</p>;
}

export function MobileEmpty({ children }: { children: React.ReactNode }) {
  return <div className="mobile-empty">{children}</div>;
}

export function MobileKpiStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string | number;
    icon?: LucideIcon;
    hint?: string;
  }>;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {items.map((item) => (
        <div
          key={item.label}
          className="mobile-card-flat flex min-w-[7.5rem] shrink-0 flex-col gap-1 p-3"
        >
          <div className="flex items-center gap-1.5">
            {item.icon && <item.icon className="h-3.5 w-3.5 text-primary" />}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.label}
            </span>
            {item.hint ? <InfoHint label={item.label} hint={item.hint} /> : null}
          </div>
          <span className="text-lg font-semibold tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

interface MobileMenuItemProps {
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  label: string;
  trailing?: React.ReactNode;
  iconMuted?: boolean;
  className?: string;
}

export function MobileMenuItem({
  href,
  onClick,
  icon: Icon,
  label,
  trailing,
  iconMuted,
  className,
}: MobileMenuItemProps) {
  const inner = (
    <>
      {Icon && (
        <span className={iconMuted ? "mobile-tile-icon-muted" : "mobile-tile-icon"}>
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {trailing}
      {href && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn("mobile-list-tile", className)}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn("mobile-list-tile w-full text-left", className)}>
      {inner}
    </button>
  );
}

export function MobileMenuList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mobile-grouped-list", className)}>{children}</div>;
}

export function MobileSegmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="mobile-segmented">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-active={value === option.value}
          className="mobile-segmented-item"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function MobileFab({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="mobile-fab" onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}
