"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Mail, UserPlus, Users, Loader2 } from "lucide-react";
import { useState } from "react";
import type { SearchResultContact } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

interface SearchResultCardProps {
  contact: SearchResultContact;
  index: number;
}

export function SearchResultCard({ contact, index }: SearchResultCardProps) {
  const router = useRouter();
  const [requestingIntro, setRequestingIntro] = useState(false);

  const handleRequestIntro = async () => {
    setRequestingIntro(true);
    try {
      const res = await fetch("/api/intros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_contact_id: contact.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request introduction");
      toast.success("Introduction requested");
      router.push("/intros");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request introduction");
    } finally {
      setRequestingIntro(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-border transition-shadow hover:border-primary/20 hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{getInitials(contact.full_name)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="font-medium hover:underline"
                >
                  {contact.full_name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {contact.title}
                  {contact.company_name && (
                    <span className="inline-flex items-center gap-1">
                      {" "}
                      at <Building2 className="inline h-3 w-3" />
                      {contact.company_name}
                    </span>
                  )}
                </p>
                {contact.network_owner_name && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    In {contact.network_owner_name}&apos;s network
                    {contact.group_name ? ` · ${contact.group_name}` : ""}
                  </p>
                )}
                {!contact.network_owner_name && contact.group_name && (
                  <p className="mt-1 text-xs text-muted-foreground">{contact.group_name}</p>
                )}
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {contact.score}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{contact.reason}</p>

            {contact.warm_intro_path.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Path:</span>
                {contact.warm_intro_path.map((name, i) => (
                  <span key={i}>
                    {i > 0 && " → "}
                    {name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/contacts/${contact.id}`}>
                  View profile
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
              {contact.email && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/contacts/${contact.id}?tab=outreach`}>
                    <Mail className="mr-1 h-3 w-3" />
                    Email
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRequestIntro}
                disabled={requestingIntro}
              >
                {requestingIntro ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <UserPlus className="mr-1 h-3 w-3" />
                )}
                Request intro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
