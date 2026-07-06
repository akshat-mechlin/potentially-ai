import { Users, Search, Link2, Handshake, Zap } from "lucide-react";
import { MobileKpiStrip } from "@/components/mobile/primitives";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DashboardStats } from "@/types";

interface DashboardWidgetsProps {
  stats: DashboardStats;
}

const widgets = [
  { key: "connected_accounts" as const, label: "Accounts", icon: Link2 },
  { key: "contacts_indexed" as const, label: "Contacts", icon: Users },
  { key: "recent_searches" as const, label: "Searches", icon: Search },
  { key: "introductions_success" as const, label: "Intros", icon: Handshake },
  { key: "ai_usage_tokens" as const, label: "AI tokens", icon: Zap },
];

export function DashboardWidgets({ stats }: DashboardWidgetsProps) {
  const { isMobileApp } = useMobileApp();

  if (isMobileApp) {
    return (
      <MobileKpiStrip
        items={widgets.map((w) => ({
          label: w.label,
          value: stats[w.key].toLocaleString(),
          icon: w.icon,
        }))}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {widgets.map((widget) => (
        <Card key={widget.key} className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
            <p className="text-kpi-label">{widget.label}</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
              <widget.icon className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-kpi-value">{stats[widget.key].toLocaleString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
