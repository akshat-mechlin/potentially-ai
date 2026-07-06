import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { getProfile } from "@/lib/data/profile";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  let profile: Awaited<ReturnType<typeof getProfile>> = null;

  try {
    profile = await getProfile();
  } catch (error) {
    console.error("Failed to load profile for app shell:", error);
  }

  return (
    <AuthenticatedShell
      profile={
        profile
          ? { name: profile.name, email: profile.email, avatar_url: profile.avatar_url }
          : null
      }
    >
      {children}
    </AuthenticatedShell>
  );
}
