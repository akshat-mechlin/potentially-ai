"use client";

import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@/types";

export function useProfile() {
  return useQuery<Profile | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json() as Promise<Profile>;
    },
    staleTime: 5 * 60 * 1000,
  });
}
