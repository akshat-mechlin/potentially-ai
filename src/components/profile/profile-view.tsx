"use client";

import { useState } from "react";
import { Building2, Globe, Link2, MapPin } from "lucide-react";
import type { Profile } from "@/types";
import { UserAvatar } from "@/components/media/user-avatar";
import { AvatarPreviewDialog } from "@/components/media/avatar-preview-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileViewProps {
  profile: Profile;
}

function externalHref(raw: string | null | undefined) {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/** Read-only profile card (how teammates see you). Edit only from Settings. */
export function ProfileView({ profile }: ProfileViewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const linkedin = externalHref(profile.linkedin_url);
  const website = externalHref(profile.website_url);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start gap-4">
            <button
              type="button"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
              disabled={!profile.avatar_url}
              onClick={() => {
                if (profile.avatar_url) setPreviewOpen(true);
              }}
              aria-label={profile.avatar_url ? "Preview profile photo" : undefined}
            >
              <UserAvatar
                name={profile.name}
                email={profile.email}
                src={profile.avatar_url}
                className={`h-24 w-24 text-xl ${profile.avatar_url ? "cursor-pointer" : ""}`}
                fallbackClassName="text-xl"
              />
            </button>
            <div className="space-y-1">
              <h1 className="font-display text-2xl text-foreground">
                {profile.name || profile.email}
              </h1>
              {profile.title ? (
                <p className="text-sm text-muted-foreground">{profile.title}</p>
              ) : null}
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          {(profile.company || profile.location) && (
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {profile.company ? (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {profile.company}
                </span>
              ) : null}
              {profile.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </span>
              ) : null}
            </div>
          )}

          {profile.bio ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{profile.bio}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No bio yet.</p>
          )}

          {(linkedin || website) && (
            <div className="flex flex-wrap gap-3">
              {linkedin ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={linkedin} target="_blank" rel="noopener noreferrer">
                    <Link2 className="mr-2 h-4 w-4" />
                    LinkedIn
                  </a>
                </Button>
              ) : null}
              {website ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={website} target="_blank" rel="noopener noreferrer">
                    <Globe className="mr-2 h-4 w-4" />
                    Website
                  </a>
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <AvatarPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        src={profile.avatar_url}
        name={profile.name}
        email={profile.email}
      />
    </div>
  );
}
