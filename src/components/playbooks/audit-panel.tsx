"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/types/playbooks";

export function AuditPanel() {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();

  const { data: auditData } = useQuery<{ logs: AuditLogEntry[] }>({
    queryKey: ["playbook-audit"],
    queryFn: () => fetch(`/api/audit?limit=50`).then((r) => r.json()),
    enabled: mounted,
  });

  return (
    <Card className={cn(isMobileApp && "mobile-card-flat border-0 shadow-none")}>
      <CardHeader className={cn(isMobileApp && "px-4 pt-4 pb-2")}>
        <CardTitle className="text-base">Audit log</CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-2", isMobileApp && "px-4 pb-4")}>
        {(auditData?.logs ?? []).length ? (
          auditData?.logs.map((log) => (
            <div
              key={log.id}
              className={cn(
                "text-sm",
                isMobileApp ? "mobile-list-row flex-col items-start gap-1 py-3" : "rounded border p-3",
              )}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">{log.action}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {log.entity_type} · {log.entity_id}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No audit events yet for this workspace.</p>
        )}
      </CardContent>
    </Card>
  );
}
