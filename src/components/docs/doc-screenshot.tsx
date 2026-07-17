"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DocScreenshot({
  src,
  alt,
  caption,
  className,
}: {
  src: string;
  alt: string;
  caption: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {failed ? (
          <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 bg-muted/40 px-6 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Screenshot coming soon</p>
            <p className="text-xs text-muted-foreground/80">{alt}</p>
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            width={1280}
            height={800}
            className="h-auto w-full object-cover object-top"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <figcaption className="text-sm leading-relaxed text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
