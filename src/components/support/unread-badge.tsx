import { cn } from "@/lib/utils";

/** Compact numeric badge for unread support messages in nav. */
export function UnreadCountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (!count || count < 1) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold leading-none text-destructive-foreground",
        className,
      )}
      aria-label={`${count} unread`}
    >
      {label}
    </span>
  );
}
