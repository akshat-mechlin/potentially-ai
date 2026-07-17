"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { DOC_PAGES, DOC_SECTIONS, docHref } from "@/lib/docs/catalog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

function activeSlug(pathname: string) {
  if (pathname === "/docs" || pathname === "/docs/") return "overview";
  const parts = pathname.split("/").filter(Boolean);
  return parts[1] ?? "overview";
}

function sectionsForSlug(slug: string) {
  const open = new Set<string>();
  for (const section of DOC_SECTIONS) {
    if (section.pages.some((page) => page.slug === slug)) {
      open.add(section.id);
    }
  }
  if (!open.size && DOC_SECTIONS[0]) open.add(DOC_SECTIONS[0].id);
  return open;
}

export function DocsNav() {
  const pathname = usePathname();
  const current = activeSlug(pathname);
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(() => sectionsForSlug(current));

  // Keep the active page's section open without syncing via an effect.
  const visibleOpenSections = useMemo(() => {
    const next = new Set(openSections);
    for (const id of sectionsForSlug(current)) next.add(id);
    return next;
  }, [openSections, current]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredPages = useMemo(() => {
    if (!normalizedQuery) return null;
    return DOC_PAGES.filter((page) => {
      const haystack = `${page.title} ${page.description} ${page.section}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav className="space-y-4" aria-label="Documentation">
      <div>
        <p className="px-2 text-sm font-semibold text-foreground">Potentially docs</p>
        <p className="mt-0.5 px-2 text-xs text-muted-foreground">
          {DOC_PAGES.length} guides for full product support
        </p>
      </div>

      <div className="relative px-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides…"
          className="h-9 pl-8 text-sm"
          aria-label="Search documentation guides"
        />
      </div>

      {filteredPages ? (
        <ul className="space-y-0.5">
          {filteredPages.length === 0 ? (
            <li className="px-2 py-2 text-xs text-muted-foreground">No guides match that search.</li>
          ) : (
            filteredPages.map((page) => {
              const active = page.slug === current;
              return (
                <li key={page.slug}>
                  <Link
                    href={docHref(page.slug)}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-secondary font-medium text-primary"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    <span className="block">{page.title}</span>
                    <span className="block text-[11px] text-muted-foreground">{page.section}</span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      ) : (
        <div className="space-y-3">
          {DOC_SECTIONS.map((section) => {
            const isOpen = visibleOpenSections.has(section.id);
            return (
              <div key={section.id}>
                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  <span>{section.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      isOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </button>
                {isOpen ? (
                  <ul className="mt-1 space-y-0.5">
                    {section.pages.map((page) => {
                      const active = page.slug === current;
                      return (
                        <li key={page.slug}>
                          <Link
                            href={docHref(page.slug)}
                            className={cn(
                              "block rounded-md px-2 py-1.5 text-sm transition-colors",
                              active
                                ? "bg-secondary font-medium text-primary"
                                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                            )}
                          >
                            {page.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
}
