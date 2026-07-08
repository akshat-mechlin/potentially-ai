"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Search,
  Network,
  Users,
  Settings,
  Handshake,
  Sparkles,
} from "lucide-react";
import { useUIStore } from "@/stores";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const commands = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Search", href: "/search", icon: Search },
  { label: "Network", href: "/network", icon: Network },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Introductions", href: "/intros", icon: Handshake },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function CommandMenu() {
  const router = useRouter();
  const { commandMenuOpen, setCommandMenuOpen } = useUIStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandMenuOpen(!commandMenuOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [commandMenuOpen, setCommandMenuOpen]);

  const runSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setCommandMenuOpen(false);
    setQuery("");
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const filteredNav = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Dialog
      open={commandMenuOpen}
      onOpenChange={(open) => {
        setCommandMenuOpen(open);
        if (!open) setQuery("");
      }}
    >
      <DialogContent className="overflow-hidden p-0 shadow-2xl">
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          shouldFilter={false}
        >
          <Command.Input
            placeholder="Search your network or jump to a page..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                e.preventDefault();
                runSearch(query);
              }
            }}
            className="flex h-12 w-full border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            {query.trim() && (
              <Command.Group heading="Search">
                <Command.Item
                  value={`search-${query}`}
                  onSelect={() => runSearch(query)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm aria-selected:bg-accent"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  Search for &quot;{query.trim()}&quot;
                </Command.Item>
              </Command.Group>
            )}
            <Command.Group heading="Navigation">
              {filteredNav.map((cmd) => (
                <Command.Item
                  key={cmd.href}
                  value={cmd.label}
                  onSelect={() => {
                    setCommandMenuOpen(false);
                    setQuery("");
                    router.push(cmd.href);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm aria-selected:bg-accent"
                >
                  <cmd.icon className="h-4 w-4" />
                  {cmd.label}
                </Command.Item>
              ))}
            </Command.Group>
            {!query.trim() && filteredNav.length === 0 && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
