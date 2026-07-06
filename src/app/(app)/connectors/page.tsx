import { Suspense } from "react";
import { ConnectorDashboard } from "@/components/connectors/connector-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConnectorsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      }
    >
      <ConnectorDashboard />
    </Suspense>
  );
}
