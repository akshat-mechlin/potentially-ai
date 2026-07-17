"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { InfoHint } from "@/components/playbooks/field-hint";
import type { ContactDetailPoint } from "@/lib/contacts/profile-details";

function SummaryBody({ text }: { text: string }) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = lines.filter((line) => /^[-•*]/.test(line));
  const paragraphs = lines.filter((line) => !/^[-•*]/.test(line));

  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {paragraphs.map((line) => (
        <p key={line.slice(0, 48)}>{line}</p>
      ))}
      {bullets.length > 0 && (
        <ul className="space-y-1.5 pl-1">
          {bullets.map((line) => (
            <li key={line.slice(0, 48)} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{line.replace(/^[-•*]\s*/, "")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const REACH_KEYS = new Set([
  "email",
  "phone",
  "work_direct_phone",
  "mobile_phone",
  "corporate_phone",
  "home_phone",
  "other_phone",
  "company_phone",
  "linkedin_url",
  "twitter_url",
  "website",
  "company_linkedin_url",
  "facebook_url",
]);

const COMPANY_KEYS = new Set([
  "location",
  "industry",
  "employees",
  "meta_employees",
  "meta_industry",
  "meta_company_city",
  "meta_company_state",
  "meta_company_country",
  "meta_company_address",
  "meta_annual_revenue",
  "meta_total_funding",
  "meta_latest_funding",
  "meta_latest_funding_amount",
  "meta_last_raised_at",
  "meta_subsidiary_of",
  "meta_technologies",
]);

const ROLE_KEYS = new Set([
  "meta_seniority",
  "meta_departments",
  "meta_sub_departments",
  "meta_stage",
  "meta_lists",
  "meta_contact_owner",
  "meta_account_owner",
  "meta_last_contacted",
  "meta_do_not_call",
  "meta_email_status",
]);

const TAG_KEYS = new Set(["meta_keywords", "meta_technologies"]);

type DetailGroup = {
  id: string;
  title: string;
  points: ContactDetailPoint[];
};

function displayLinkLabel(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const path = `${url.hostname.replace(/^www\./, "")}${url.pathname}`.replace(/\/$/, "");
    return path.length > 42 ? `${path.slice(0, 40)}…` : path;
  } catch {
    return value.length > 42 ? `${value.slice(0, 40)}…` : value;
  }
}

function splitTags(value: string) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of value.split(/[,;|]/)) {
    const tag = part.trim();
    if (!tag) continue;
    const fingerprint = tag.toLowerCase();
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    tags.push(tag);
  }
  return tags;
}

function groupDetails(details: ContactDetailPoint[]): DetailGroup[] {
  const reach: ContactDetailPoint[] = [];
  const company: ContactDetailPoint[] = [];
  const role: ContactDetailPoint[] = [];
  const tags: ContactDetailPoint[] = [];
  const more: ContactDetailPoint[] = [];

  for (const point of details) {
    // Skip noisy boolean false values
    if (/^(false|null|undefined|n\/a|none)$/i.test(point.value.trim())) continue;

    if (TAG_KEYS.has(point.key) || /keyword|technolog/i.test(point.label)) {
      tags.push(point);
    } else if (REACH_KEYS.has(point.key) || point.kind === "email" || point.kind === "phone" || point.kind === "link") {
      reach.push(point);
    } else if (COMPANY_KEYS.has(point.key) || /compan|industry|employee|funding|revenue|location|city|country/i.test(point.label)) {
      company.push(point);
    } else if (ROLE_KEYS.has(point.key) || /senior|department|stage|owner|list|status/i.test(point.label)) {
      role.push(point);
    } else {
      more.push(point);
    }
  }

  return [
    { id: "reach", title: "Reach", points: reach },
    { id: "company", title: "Company", points: company },
    { id: "role", title: "Role & status", points: role },
    { id: "tags", title: "Keywords & tech", points: tags },
    { id: "more", title: "More", points: more },
  ].filter((group) => group.points.length > 0);
}

function DetailLabel({ point }: { point: ContactDetailPoint }) {
  return (
    <span className="inline-flex items-start gap-1">
      <span className="leading-snug">{point.label}</span>
      {point.hint ? (
        <span className="mt-0.5 shrink-0">
          <InfoHint label={point.label} hint={point.hint} />
        </span>
      ) : null}
    </span>
  );
}

function FieldRow({ point }: { point: ContactDetailPoint }) {
  const isLink = Boolean(point.href);
  const label = isLink && point.kind === "link" ? displayLinkLabel(point.value) : point.value;

  return (
    <div className="grid grid-cols-[minmax(7.5rem,11rem)_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5">
      <dt className="text-xs text-muted-foreground">
        <DetailLabel point={point} />
      </dt>
      <dd className="min-w-0 pt-px text-sm text-foreground">
        {point.href ? (
          <a
            href={point.href}
            target={point.kind === "link" ? "_blank" : undefined}
            rel={point.kind === "link" ? "noopener noreferrer" : undefined}
            className="break-all font-medium text-primary hover:underline"
            title={point.value}
          >
            {label}
          </a>
        ) : (
          <p className="line-clamp-2 break-words" title={point.value}>
            {point.value}
          </p>
        )}
      </dd>
    </div>
  );
}

function TagBlock({ point }: { point: ContactDetailPoint }) {
  const [expanded, setExpanded] = useState(false);
  const tags = splitTags(point.value);
  const visible = expanded ? tags : tags.slice(0, 8);
  const remaining = tags.length - visible.length;

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        <DetailLabel point={point} />
      </p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-muted/70 px-2 py-0.5 text-xs text-foreground"
          >
            {tag}
          </span>
        ))}
        {remaining > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-md px-2 py-0.5 text-xs font-medium text-primary hover:underline"
          >
            +{remaining} more
          </button>
        ) : null}
        {expanded && tags.length > 8 ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground hover:underline"
          >
            Show less
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ContactProfileSummary({
  summary,
  details,
  variant = "desktop",
}: {
  summary?: string;
  details?: ContactDetailPoint[];
  variant?: "desktop" | "mobile";
}) {
  const shell =
    variant === "mobile"
      ? "mobile-card-flat space-y-3 p-4"
      : "rounded-xl border bg-card p-0";

  const groups = useMemo(() => groupDetails(details ?? []), [details]);

  return (
    <div className="space-y-4">
      <div className={shell}>
        {variant === "desktop" ? (
          <div className="space-y-3 p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Summary
            </h3>
            {summary ? (
              <SummaryBody text={summary} />
            ) : (
              <p className="text-sm text-muted-foreground">Generating summary…</p>
            )}
          </div>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Summary
            </p>
            {summary ? (
              <SummaryBody text={summary} />
            ) : (
              <p className="text-sm text-muted-foreground">Generating summary…</p>
            )}
          </>
        )}
      </div>

      {groups.length > 0 && (
        <div className={variant === "mobile" ? "mobile-card-flat space-y-4 p-4" : "rounded-xl border bg-card p-6"}>
          <h3 className="text-sm font-semibold text-foreground">Contact details</h3>

          <div className={variant === "mobile" ? "mt-3 space-y-5" : "mt-5 space-y-6"}>
            {groups.map((group) => (
              <section key={group.id} className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </h4>

                {group.id === "tags" ? (
                  <div className="space-y-3">
                    {group.points.map((point) => (
                      <TagBlock key={point.key} point={point} />
                    ))}
                  </div>
                ) : (
                  <dl
                    className={
                      variant === "mobile"
                        ? "space-y-2.5"
                        : "grid gap-x-10 gap-y-2.5 md:grid-cols-2"
                    }
                  >
                    {group.points.map((point) => (
                      <FieldRow key={point.key} point={point} />
                    ))}
                  </dl>
                )}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
