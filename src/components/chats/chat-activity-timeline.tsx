"use client";

import {
  CalendarCheck,
  Mail,
  MessageSquare,
  Pencil,
  Reply,
  ScrollText,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { ChatActivityItem } from "@/types/chats";

function activityIcon(type: ChatActivityItem["type"]) {
  switch (type) {
    case "message":
      return MessageSquare;
    case "email_sent":
      return Mail;
    case "reply":
      return Reply;
    case "booked":
      return CalendarCheck;
    case "draft":
      return Pencil;
    case "system":
      return ScrollText;
    default:
      return ScrollText;
  }
}

interface ChatActivityTimelineProps {
  activities: ChatActivityItem[];
}

export function ChatActivityTimeline({ activities }: ChatActivityTimelineProps) {
  if (!activities.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {activities.map((item) => {
        const Icon = activityIcon(item.type);
        return (
          <li key={item.id} className="flex gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium capitalize">{item.title}</p>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatRelativeTime(item.created_at)}
                </span>
              </div>
              {item.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
