"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Handshake, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import type { Contact, Introduction } from "@/types";
import { toast } from "sonner";

const statusConfig = {
  draft: { icon: Clock, label: "Draft", color: "text-muted-foreground" },
  requested: { icon: Handshake, label: "Requested", color: "text-yellow-600" },
  accepted: { icon: CheckCircle, label: "Accepted", color: "text-green-600" },
  declined: { icon: XCircle, label: "Declined", color: "text-red-600" },
  completed: { icon: CheckCircle, label: "Completed", color: "text-green-600" },
};

export default function IntrosPage() {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: introsData, isLoading } = useQuery<{ introductions: Introduction[] }>({
    queryKey: ["intros"],
    queryFn: () => fetch("/api/intros").then((r) => r.json()),
  });

  const { data: contactsData } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["contacts"],
    queryFn: () => fetch("/api/contacts").then((r) => r.json()),
  });

  const handleRequest = async () => {
    if (!contactId) {
      toast.error("Select a contact");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/intros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_contact_id: contactId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request introduction");

      await queryClient.invalidateQueries({ queryKey: ["intros"] });
      toast.success("Introduction requested");
      setOpen(false);
      setContactId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request introduction");
    } finally {
      setSubmitting(false);
    }
  };

  const introductions = introsData?.introductions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sub text-muted-foreground">Track and manage warm introduction requests</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Request Introduction</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request introduction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  {(contactsData?.contacts ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleRequest} disabled={submitting} className="w-full">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading introductions...</p>
      ) : (
        <div className="space-y-4">
          {introductions.map((intro) => {
            const contact = intro.target_contact;
            if (!contact) return null;
            const config = statusConfig[intro.status];
            const StatusIcon = config.icon;
            return (
              <Card key={intro.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(contact.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{contact.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.title} at {contact.company_name}
                    </p>
                    {intro.connector_name && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Via {intro.connector_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-sm ${config.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      {config.label}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(intro.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
