"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
}

/** Profile image with initials placeholder when none is set. */
export function UserAvatar({ name, email, src, className, fallbackClassName }: UserAvatarProps) {
  const label = name?.trim() || email?.trim() || "User";
  return (
    <Avatar className={cn(className)}>
      {src ? <AvatarImage src={src} alt={label} /> : null}
      <AvatarFallback className={cn("bg-primary/10 text-primary", fallbackClassName)}>
        {getInitials(label)}
      </AvatarFallback>
    </Avatar>
  );
}
