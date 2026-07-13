"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileSearchBar } from "@/components/mobile/native-ui";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import type { ChatInboxItem } from "@/types/chats";
import { toast } from "sonner";

function statusLabel(status: ChatInboxItem["status"]) {
  return status.replace(/_/g, " ");
}

interface ChatInboxListProps {
  chats: ChatInboxItem[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId?: string | null;
  selectedContactId?: string | null;
  compact?: boolean;
}

export function ChatInboxList({
  chats,
  isLoading,
  search,
  onSearchChange,
  selectedId,
  selectedContactId,
  compact = false,
}: ChatInboxListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobileApp } = useMobileApp();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = chats.filter((chat) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      chat.contact_name.toLowerCase().includes(q) ||
      chat.contact_email?.toLowerCase().includes(q) ||
      chat.company_name?.toLowerCase().includes(q) ||
      chat.playbook_name.toLowerCase().includes(q) ||
      chat.last_message_preview?.toLowerCase().includes(q)
    );
  });

  const deleteChat = async (runContactId: string) => {
    if (
      !window.confirm(
        "Delete this conversation from your inbox? The other person will still see it.",
      )
    ) {
      return;
    }

    setDeletingId(runContactId);
    try {
      const res = await fetch(`/api/chats/${runContactId}`, { method: "DELETE" });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to delete conversation");
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.removeQueries({ queryKey: ["chat-detail", runContactId] });
      toast.success("Conversation deleted");
      if (pathname === `/chats/${runContactId}`) {
        router.push("/chats");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete conversation");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", compact && "min-h-0")}>
      <div className="shrink-0 border-b border-border p-3">
        {isMobileApp ? (
          <MobileSearchBar
            value={search}
            onChange={onSearchChange}
            placeholder="Search conversations..."
          />
        ) : (
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="h-9"
          />
        )}
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="text-xs text-muted-foreground">
              Active playbook prospects and their messages appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((chat) => {
              const href = `/chats/${chat.run_contact_id}`;
              const isActive =
                selectedId === chat.run_contact_id ||
                pathname === href ||
                Boolean(selectedContactId && chat.contact_id === selectedContactId);
              return (
                <li key={`${chat.direction}:${chat.contact_id}`} className="group relative">
                  <Link
                    href={href}
                    className={cn(
                      "flex gap-3 px-3 py-3 pr-12 transition-colors hover:bg-muted/50",
                      isActive && "bg-secondary/80",
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {getInitials(chat.contact_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{chat.contact_name}</p>
                        {chat.last_message_at && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatRelativeTime(chat.last_message_at)}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {chat.company_name ?? chat.contact_title ?? chat.playbook_name}
                      </p>
                      {chat.last_message_preview && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                          {chat.last_message_preview}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {chat.direction === "inbox" ? "Inbox" : statusLabel(chat.status)}
                        </Badge>
                        {chat.direction === "outreach" && chat.delivery_mode === "email" && (
                          <Badge variant="secondary" className="text-[10px]">
                            Via email
                          </Badge>
                        )}
                        {chat.direction === "outreach" && chat.recipient_on_platform && (
                          <Badge variant="secondary" className="text-[10px]">
                            On platform
                          </Badge>
                        )}
                        {chat.message_count > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {chat.message_count} message{chat.message_count === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-3 h-8 w-8 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Delete conversation with ${chat.contact_name}`}
                    disabled={deletingId === chat.run_contact_id}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void deleteChat(chat.run_contact_id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
