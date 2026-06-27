import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";

interface BrandLogoProps {
  href?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: {
    mark: "h-8 w-8",
    text: "text-lg",
  },
  md: {
    mark: "h-9 w-9",
    text: "text-xl",
  },
  lg: {
    mark: "h-12 w-12",
    text: "text-2xl sm:text-3xl",
  },
} as const;

export function BrandLogo({
  href,
  showText = true,
  size = "md",
  className,
}: BrandLogoProps) {
  const s = sizeStyles[size];

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={cn(s.mark, "rounded-lg")} variant="tile" />
      {showText && (
        <span className={cn("font-display tracking-tight text-foreground", s.text)}>
          Potentially
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex" aria-label="Potentially home">
        {content}
      </Link>
    );
  }

  return content;
}
