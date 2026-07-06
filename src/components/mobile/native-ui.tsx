"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOBILE_BOTTOM_SHEET } from "@/components/mobile/primitives";

/* ─── Scaffold (Flutter Scaffold / RN SafeAreaView) ─── */

export function MobileScreen({
  children,
  className,
  scroll = true,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  scroll?: boolean;
  padded?: boolean;
}) {
  const inner = (
    <div className={cn(padded && "px-4 pb-28 pt-1", !padded && "pb-24", className)}>{children}</div>
  );

  if (!scroll) return <div className="mobile-screen">{inner}</div>;

  return (
    <div className="mobile-screen-scroll">
      {inner}
    </div>
  );
}

export function MobileLargeTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mobile-large-title">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

/* ─── Pressable (TouchableOpacity / InkWell) ─── */

export function MobilePressable({
  children,
  className,
  onClick,
  href,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const classes = cn("mobile-pressable", disabled && "mobile-pressable-disabled", className);

  if (href && !disabled) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cn(classes, "w-full text-left")}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/* ─── Grouped list (iOS InsetGrouped / Material list sections) ─── */

export function MobileListSection({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mobile-grouped-section", className)}>
      {title && <p className="mobile-section-label">{title}</p>}
      <div className="mobile-grouped-list">{children}</div>
      {footer && <p className="mobile-grouped-footer">{footer}</p>}
    </section>
  );
}

export function MobileListTile({
  href,
  onClick,
  leading,
  icon,
  iconMuted,
  title,
  subtitle,
  trailing,
  chevron = Boolean(href),
  destructive,
  className,
}: {
  href?: string;
  onClick?: () => void;
  leading?: React.ReactNode;
  icon?: LucideIcon;
  iconMuted?: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  className?: string;
}) {
  const Icon = icon;
  const content = (
    <>
      {leading}
      {Icon && (
        <span className={iconMuted ? "mobile-tile-icon-muted" : "mobile-tile-icon"}>
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className="mobile-tile-body">
        <span className={cn("mobile-tile-title", destructive && "text-destructive")}>{title}</span>
        {subtitle && <span className="mobile-tile-subtitle">{subtitle}</span>}
      </span>
      {trailing && <span className="mobile-tile-trailing">{trailing}</span>}
      {chevron && href && <ChevronRight className="mobile-tile-chevron" />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn("mobile-list-tile", className)} onClick={onClick}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn("mobile-list-tile", className)}>
        {content}
      </button>
    );
  }

  return <div className={cn("mobile-list-tile mobile-list-tile-static", className)}>{content}</div>;
}

export function MobileSwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mobile-list-tile mobile-list-tile-static">
      <span className="mobile-tile-body">
        <span className="mobile-tile-title">{label}</span>
        {description && <span className="mobile-tile-subtitle">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function MobileSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search",
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  loading?: boolean;
}) {
  return (
    <div className="mobile-search-bar">
      <Search className="mobile-search-bar-icon" />
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit?.()}
        placeholder={placeholder}
        className="mobile-search-bar-input"
      />
      {loading && <span className="mobile-search-bar-spinner" aria-hidden />}
    </div>
  );
}

export function MobileChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      data-active={active}
      className="mobile-chip"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function MobileChipRow({ children }: { children: React.ReactNode }) {
  return <div className="mobile-chip-row">{children}</div>;
}

export function MobileAvatarTile({
  href,
  onClick,
  name,
  subtitle,
  initials,
  trailing,
  avatar,
}: {
  href?: string;
  onClick?: () => void;
  name: string;
  subtitle?: string;
  initials: string;
  trailing?: React.ReactNode;
  avatar?: React.ReactNode;
}) {
  return (
    <MobileListTile
      href={href}
      onClick={onClick}
      leading={
        avatar ?? (
          <span className="mobile-avatar-tile">
            {initials}
          </span>
        )
      }
      title={name}
      subtitle={subtitle}
      trailing={trailing}
      chevron={Boolean(href)}
    />
  );
}

export function MobileBottomSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(MOBILE_BOTTOM_SHEET, "gap-0 shadow-2xl")}>
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
        {title && (
          <DialogHeader className="border-b border-border px-5 py-3 text-left">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="max-h-[70dvh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MobileEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mobile-empty-state">
      {Icon && (
        <span className="mobile-empty-state-icon">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="mobile-empty-state-title">{title}</p>
      {description && <p className="mobile-empty-state-desc">{description}</p>}
      {action}
    </div>
  );
}
