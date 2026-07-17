"use client";

import { cn } from "@/lib/utils";

export function DocsToc({
  items,
}: {
  items: Array<{ id: string; text: string; level: 2 | 3 }>;
}) {
  if (!items.length) return null;

  return (
    <nav aria-label="On this page" className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1.5 border-l border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block border-l-2 border-transparent py-0.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
                item.level === 3 ? "pl-5" : "pl-3",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
