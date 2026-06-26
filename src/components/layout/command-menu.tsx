"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Search,
  Network,
  Users,
  Settings,
  Handshake,
} from "lucide-react";
import { useUIStore } from "@/stores";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const commands = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Search", href: "/search", icon: Search },
  { label: "Network Graph", href: "/network", icon: Network },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Introductions", href: "/intros", icon: Handshake },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function CommandMenu() {
  const router = useRouter();
  const { commandMenuOpen, setCommandMenuOpen } = useUIStore();

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

  return (
    <Dialog open={commandMenuOpen} onOpenChange={setCommandMenuOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <Command.Input
            placeholder="Type a command or search..."
            className="flex h-12 w-full border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            <Command.Group heading="Navigation">
              {commands.map((cmd) => (
                <Command.Item
                  key={cmd.href}
                  onSelect={() => {
                    setCommandMenuOpen(false);
                    router.push(cmd.href);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm aria-selected:bg-accent"
                >
                  <cmd.icon className="h-4 w-4" />
                  {cmd.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
