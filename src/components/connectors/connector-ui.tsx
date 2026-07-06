import { cn } from "@/lib/utils";
import type { ConnectorState } from "@/lib/connectors/types";

const CAPABILITY_LABELS: Record<string, string> = {
  contacts: "Contacts",
  calendar: "Calendar",
  email: "Email",
  files: "Files",
  social: "Social",
  messages: "Messages",
};

export function ConnectorBrandIcon({
  connector,
  className,
}: {
  connector: Pick<ConnectorState, "brandColor" | "brandInitial" | "name">;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm",
        className,
      )}
      style={{ backgroundColor: connector.brandColor }}
      aria-hidden
    >
      {connector.brandInitial || connector.name.charAt(0)}
    </div>
  );
}

export function ConnectorAvailabilityBadge({
  availability,
  connected,
}: {
  availability: ConnectorState["availability"];
  connected: boolean;
}) {
  if (connected) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-800 dark:bg-green-900/30 dark:text-green-300">
        Connected
      </span>
    );
  }
  if (availability === "coming_soon") {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Coming soon
      </span>
    );
  }
  if (availability === "beta") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        Beta
      </span>
    );
  }
  return null;
}

export function ConnectorCapabilityTags({
  capabilities,
}: {
  capabilities: ConnectorState["capabilities"];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {capabilities.map((cap) => (
        <span
          key={cap}
          className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {CAPABILITY_LABELS[cap] ?? cap}
        </span>
      ))}
    </div>
  );
}
