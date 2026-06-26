"use client";

import { Handshake, Clock, CheckCircle, XCircle } from "lucide-react";
import { DEMO_CONTACTS } from "@/lib/demo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatRelativeTime } from "@/lib/utils";

const introductions = [
  {
    id: "intro-1",
    target: DEMO_CONTACTS[0],
    status: "requested" as const,
    connector: "Emily Rodriguez",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "intro-2",
    target: DEMO_CONTACTS[2],
    status: "completed" as const,
    connector: "You",
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "intro-3",
    target: DEMO_CONTACTS[4],
    status: "draft" as const,
    connector: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

const statusConfig = {
  draft: { icon: Clock, label: "Draft", color: "text-muted-foreground" },
  requested: { icon: Handshake, label: "Requested", color: "text-yellow-600" },
  accepted: { icon: CheckCircle, label: "Accepted", color: "text-green-600" },
  declined: { icon: XCircle, label: "Declined", color: "text-red-600" },
  completed: { icon: CheckCircle, label: "Completed", color: "text-green-600" },
};

export default function IntrosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Introductions</h1>
          <p className="text-muted-foreground">Track and manage warm introduction requests</p>
        </div>
        <Button>Request Introduction</Button>
      </div>

      <div className="space-y-4">
        {introductions.map((intro) => {
          const config = statusConfig[intro.status];
          const StatusIcon = config.icon;
          return (
            <Card key={intro.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(intro.target.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{intro.target.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {intro.target.title} at {intro.target.company_name}
                  </p>
                  {intro.connector && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Via {intro.connector}
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
    </div>
  );
}
