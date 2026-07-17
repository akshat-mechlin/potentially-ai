"use client";

import { useEffect, useMemo, useRef } from "react";

interface CalendlyEmbedProps {
  url: string;
  /** Called automatically when Calendly reports event_scheduled */
  onBooked?: () => void;
  /** Prefill contact email in the widget */
  prefillEmail?: string | null;
  /** Prefill contact name */
  prefillName?: string | null;
  /** Passed as utm_content so webhooks can match this prospect */
  trackingId?: string | null;
}

function isCalendlyEvent(event: MessageEvent) {
  return (
    event.origin === "https://calendly.com" &&
    typeof event.data === "object" &&
    event.data !== null &&
    typeof (event.data as { event?: unknown }).event === "string" &&
    String((event.data as { event: string }).event).startsWith("calendly.")
  );
}

export function CalendlyEmbed({
  url,
  onBooked,
  prefillEmail,
  prefillName,
  trackingId,
}: CalendlyEmbedProps) {
  const bookedRef = useRef(false);

  const embedUrl = useMemo(() => {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("embed_type", "Inline");
      if (typeof window !== "undefined") {
        parsed.searchParams.set("embed_domain", window.location.host);
      }
      if (prefillEmail) parsed.searchParams.set("email", prefillEmail);
      if (prefillName) parsed.searchParams.set("name", prefillName);
      if (trackingId) {
        parsed.searchParams.set("utm_source", "potentially");
        parsed.searchParams.set("utm_content", trackingId);
      }
      return parsed.toString();
    } catch {
      const base = url.includes("?") ? `${url}&embed_type=Inline` : `${url}?embed_type=Inline`;
      return base;
    }
  }, [url, prefillEmail, prefillName, trackingId]);

  useEffect(() => {
    if (!onBooked) return;

    const handleMessage = (event: MessageEvent) => {
      if (!isCalendlyEvent(event)) return;
      const data = event.data as { event: string };
      if (data.event !== "calendly.event_scheduled") return;
      if (bookedRef.current) return;
      bookedRef.current = true;
      onBooked();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onBooked]);

  return (
    <div className="overflow-hidden rounded-lg border">
      <iframe
        src={embedUrl}
        title="Schedule a meeting"
        className="h-[520px] w-full border-0"
        allow="camera; microphone; fullscreen"
      />
      <p className="border-t bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
        Booking is detected automatically. No extra steps needed.
      </p>
    </div>
  );
}
