"use client";

import { ChevronRight } from "lucide-react";
import type { Contact } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileListTile } from "@/components/mobile/native-ui";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { getInitials, formatRelativeTime } from "@/lib/utils";

interface ContactCardProps {
  contact: Contact;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (contactId: string) => void;
}

export function ContactCard({ contact, selectable, selected, onToggle }: ContactCardProps) {
  const { isMobileApp } = useMobileApp();

  if (isMobileApp && !selectable) {
    return (
      <MobileListTile
        href={`/contacts/${contact.id}`}
        leading={<span className="mobile-avatar-tile">{getInitials(contact.full_name)}</span>}
        title={contact.full_name}
        subtitle={[contact.title, contact.company_name].filter(Boolean).join(" · ")}
        trailing={<span className="text-xs font-semibold text-primary">{contact.strength_score}%</span>}
      />
    );
  }

  if (isMobileApp && selectable) {
    return (
      <button
        type="button"
        onClick={() => onToggle?.(contact.id)}
        className={`mobile-list-tile w-full text-left ${selected ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle?.(contact.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 shrink-0 rounded border-border"
        />
        <span className="mobile-avatar-tile">{getInitials(contact.full_name)}</span>
        <span className="mobile-tile-body">
          <span className="mobile-tile-title">{contact.full_name}</span>
          <span className="mobile-tile-subtitle">{contact.company_name ?? contact.title}</span>
        </span>
      </button>
    );
  }

  const inner = (
    <Card
      className={`border-border transition-all ${
        selectable
          ? selected
            ? "border-primary shadow-md"
            : "hover:border-primary/30 hover:shadow-md cursor-pointer"
          : "hover:border-primary/30 hover:shadow-md"
      }`}
      onClick={selectable ? () => onToggle?.(contact.id) : undefined}
    >
      <CardContent className="flex items-start gap-4 p-4">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle?.(contact.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-3 h-4 w-4 rounded border-border"
          />
        )}
        <Avatar className="h-10 w-10">
          <AvatarFallback>{getInitials(contact.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{contact.full_name}</p>
              <p className="text-sm text-muted-foreground">{contact.title}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-primary">{contact.strength_score}%</span>
          </div>
          {contact.company_name && (
            <p className="mt-1 text-xs text-muted-foreground">{contact.company_name}</p>
          )}
          {contact.email && <p className="mt-1 text-xs text-muted-foreground">{contact.email}</p>}
          {contact.last_interaction_at && (
            <p className="mt-2 text-xs text-muted-foreground">
              Last contact {formatRelativeTime(contact.last_interaction_at)}
            </p>
          )}
        </div>
        {!selectable && <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />}
      </CardContent>
    </Card>
  );

  return inner;
}
