import { Users, Search, Link2, Handshake, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/types";

interface DashboardWidgetsProps {
  stats: DashboardStats;
}

const widgets = [
  { key: "connected_accounts" as const, label: "Connected Accounts", icon: Link2 },
  { key: "contacts_indexed" as const, label: "Contacts Indexed", icon: Users },
  { key: "recent_searches" as const, label: "Recent Searches", icon: Search },
  { key: "introductions_success" as const, label: "Introductions", icon: Handshake },
  { key: "ai_usage_tokens" as const, label: "AI Tokens Used", icon: Zap },
];

export function DashboardWidgets({ stats }: DashboardWidgetsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {widgets.map((widget) => (
        <Card key={widget.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {widget.label}
            </CardTitle>
            <widget.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats[widget.key].toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
