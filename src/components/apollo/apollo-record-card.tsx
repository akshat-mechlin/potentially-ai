"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApolloRecord } from "@/lib/data/apollo-records";
import {
  formatApolloLastRefreshed,
  getApolloAvailabilityFlags,
  getApolloOrganizationDisplayName,
  getApolloPersonDisplayName,
  isApolloSearchPreview,
  isUnverifiedApolloStub,
  joinLocationParts,
} from "@/lib/integrations/apollo/present-record";
import type { ApolloOrganization, ApolloPerson } from "@/lib/integrations/apollo/types";

type ApolloRecordCardProps = {
  recordType: "person" | "organization";
  data: ApolloPerson | ApolloOrganization | ApolloRecord;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  selectable?: boolean;
  showEnrichHint?: boolean;
  className?: string;
};

function isSavedRecord(
  data: ApolloPerson | ApolloOrganization | ApolloRecord,
): data is ApolloRecord {
  return "record_type" in data && "enrichment_status" in data;
}

export function ApolloRecordCard({
  recordType,
  data,
  selected,
  onSelectChange,
  selectable = false,
  showEnrichHint = false,
  className,
}: ApolloRecordCardProps) {
  const saved = isSavedRecord(data);
  const raw = saved ? (data.raw_apollo as ApolloPerson | ApolloOrganization) : data;
  const enriched = saved && data.enrichment_status === "enriched";

  const name =
    recordType === "person"
      ? saved
        ? data.name
        : getApolloPersonDisplayName(raw as ApolloPerson)
      : saved
        ? data.name
        : getApolloOrganizationDisplayName(raw as ApolloOrganization);

  const person = recordType === "person" ? (raw as ApolloPerson) : null;
  const org = recordType === "organization" ? (raw as ApolloOrganization) : person?.organization;

  const title = saved ? data.title : person?.title;
  const company = saved ? data.company_name : person?.organization?.name ?? org?.name;
  const email = saved ? data.email : person?.email;
  const phone = saved ? data.phone : null;
  const location =
    saved && data.location
      ? data.location
      : joinLocationParts([
          person?.city ?? org?.city,
          person?.state ?? org?.state,
          person?.country ?? org?.country,
        ]);
  const domain = saved ? data.primary_domain : org?.primary_domain;
  const preview = !enriched && isApolloSearchPreview(raw);
  const availability = preview ? getApolloAvailabilityFlags(raw, recordType) : [];
  const lastRefreshed = formatApolloLastRefreshed(
    (raw as ApolloPerson).last_refreshed_at as string | undefined,
  );
  const unverified = saved && isUnverifiedApolloStub(data.apollo_id);

  const content = (
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{name}</p>
        {unverified ? (
          <Badge variant="outline" className="text-[10px]">
            Not verified in Apollo
          </Badge>
        ) : null}
        {saved && data.enrichment_status === "enriched" ? (
          <Badge variant="secondary" className="text-[10px]">
            Enriched
          </Badge>
        ) : null}
      </div>

      {(title || company) && (
        <p className="text-xs text-muted-foreground">
          {[title, company].filter(Boolean).join(" · ")}
        </p>
      )}

      {enriched ? (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {email ? <p>{email}</p> : null}
          {phone ? <p>{phone}</p> : null}
          {location ? <p>{location}</p> : null}
          {domain ? <p>{domain}</p> : null}
        </div>
      ) : preview ? (
        <div className="flex flex-wrap gap-1.5">
          {availability.map((flag) => (
            <Badge key={flag.key} variant="outline" className="text-[10px] font-normal">
              {flag.label}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {email ? <p>{email}</p> : null}
          {location ? <p>{location}</p> : null}
          {domain ? <p>{domain}</p> : null}
        </div>
      )}

      {lastRefreshed ? <p className="text-[11px] text-muted-foreground">{lastRefreshed}</p> : null}

      {showEnrichHint && preview ? (
        <p className="text-[11px] text-muted-foreground">Enrich to reveal contact details.</p>
      ) : null}
    </div>
  );

  if (!selectable) {
    return (
      <div className={cn("rounded-lg border border-border/70 p-3", className)}>{content}</div>
    );
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 p-3 hover:border-primary/30",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) => onSelectChange?.(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border"
      />
      {content}
    </label>
  );
}
