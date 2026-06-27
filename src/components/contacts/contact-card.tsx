"use client";

import Link from "next/link";
import { Building2, Mail, ExternalLink } from "lucide-react";
import type { Contact } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatRelativeTime } from "@/lib/utils";

interface ContactCardProps {
  contact: Contact;
}

export function ContactCard({ contact }: ContactCardProps) {
  return (
    <Link href={`/contacts/${contact.id}`}>
      <Card className="border-border transition-all hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{getInitials(contact.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{contact.full_name}</h3>
                <p className="text-sm text-muted-foreground">{contact.title}</p>
              </div>
              <div className="text-xs font-medium text-primary">
                {contact.strength_score}%
              </div>
            </div>
            {contact.company_name && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {contact.company_name}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              {contact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {contact.email}
                </span>
              )}
              {contact.linkedin_url && <ExternalLink className="h-3 w-3" />}
            </div>
            {contact.last_interaction_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                Last interaction {formatRelativeTime(contact.last_interaction_at)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
