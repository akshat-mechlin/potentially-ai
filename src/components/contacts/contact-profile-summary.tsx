"use client";

import { ExternalLink, Mail, Phone, Sparkles } from "lucide-react";
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

function DetailIcon({ kind }: { kind: ContactDetailPoint["kind"] }) {
  if (kind === "email") return <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  if (kind === "phone") return <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  if (kind === "link") return <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  return <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />;
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

      {details && details.length > 0 && (
        <div className={variant === "mobile" ? "mobile-card-flat space-y-2 p-4" : "rounded-xl border bg-card p-6"}>
          <h3 className="text-sm font-semibold text-foreground">Contact details</h3>
          <ul className="mt-3 space-y-2">
            {details.map((point) => (
              <li
                key={point.key}
                className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
              >
                <DetailIcon kind={point.kind} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {point.label}
                  </p>
                  {point.href ? (
                    <a
                      href={point.href}
                      target={point.kind === "link" ? "_blank" : undefined}
                      rel={point.kind === "link" ? "noopener noreferrer" : undefined}
                      className="break-all text-sm font-medium text-primary hover:underline"
                    >
                      {point.value}
                    </a>
                  ) : (
                    <p className="break-words text-sm text-foreground">{point.value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
