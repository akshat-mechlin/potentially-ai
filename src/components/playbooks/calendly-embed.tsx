"use client";

interface CalendlyEmbedProps {
  url: string;
  onBooked?: () => void;
}

export function CalendlyEmbed({ url, onBooked }: CalendlyEmbedProps) {
  const embedUrl = url.includes("?") ? `${url}&embed_type=Inline` : `${url}?embed_type=Inline`;

  return (
    <div className="overflow-hidden rounded-lg border">
      <iframe
        src={embedUrl}
        title="Schedule a meeting"
        className="h-[520px] w-full border-0"
        onLoad={() => {
          // Calendly postMessage booking events require their script; manual confirm fallback:
          void onBooked;
        }}
      />
      {onBooked && (
        <div className="border-t bg-muted/30 p-3 text-center">
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline"
            onClick={onBooked}
          >
            I booked a meeting — mark as booked
          </button>
        </div>
      )}
    </div>
  );
}
