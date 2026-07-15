"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProfileView } from "@/components/profile/profile-view";
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile } from "@/types";

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params.id;

  const { data: profile, isLoading, error } = useQuery<Profile>({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${encodeURIComponent(profileId)}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Profile not found");
      }
      return res.json();
    },
    enabled: Boolean(profileId),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Profile not found."}
        <p className="mt-2">
          You can only view profiles of people you share a group with (or your own).
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <ProfileView profile={profile} />
    </div>
  );
}
