"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import { assertImageFile, uploadPublicImage } from "@/lib/storage/media-upload";
import type { Profile } from "@/types";
import { UserAvatar } from "@/components/media/user-avatar";
import { AvatarCropDialog } from "@/components/media/avatar-crop-dialog";
import { AvatarPreviewDialog } from "@/components/media/avatar-preview-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ProfileEditorProps {
  profile: Profile;
  compact?: boolean;
}

function profileFormSnapshot(values: {
  name: string;
  title: string;
  bio: string;
  company: string;
  location: string;
  linkedinUrl: string;
  websiteUrl: string;
  avatarUrl: string | null;
}) {
  return {
    name: values.name.trim(),
    title: values.title.trim(),
    bio: values.bio.trim(),
    company: values.company.trim(),
    location: values.location.trim(),
    linkedin_url: values.linkedinUrl.trim(),
    website_url: values.websiteUrl.trim(),
    avatar_url: values.avatarUrl,
  };
}

export function ProfileEditor({ profile, compact }: ProfileEditorProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropObjectUrlRef = useRef<string | null>(null);
  const [name, setName] = useState(profile.name ?? "");
  const [title, setTitle] = useState(profile.title ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [company, setCompany] = useState(profile.company ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- form draft mirrors fetched profile
    setName(profile.name ?? "");
    setTitle(profile.title ?? "");
    setBio(profile.bio ?? "");
    setCompany(profile.company ?? "");
    setLocation(profile.location ?? "");
    setLinkedinUrl(profile.linkedin_url ?? "");
    setWebsiteUrl(profile.website_url ?? "");
    setAvatarUrl(profile.avatar_url);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (cropObjectUrlRef.current) URL.revokeObjectURL(cropObjectUrlRef.current);
    };
  }, []);

  const savedSnapshot = useMemo(
    () =>
      profileFormSnapshot({
        name: profile.name ?? "",
        title: profile.title ?? "",
        bio: profile.bio ?? "",
        company: profile.company ?? "",
        location: profile.location ?? "",
        linkedinUrl: profile.linkedin_url ?? "",
        websiteUrl: profile.website_url ?? "",
        avatarUrl: profile.avatar_url,
      }),
    [profile],
  );

  const currentSnapshot = useMemo(
    () =>
      profileFormSnapshot({
        name,
        title,
        bio,
        company,
        location,
        linkedinUrl,
        websiteUrl,
        avatarUrl,
      }),
    [name, title, bio, company, location, linkedinUrl, websiteUrl, avatarUrl],
  );

  const isDirty = useMemo(
    () => JSON.stringify(currentSnapshot) !== JSON.stringify(savedSnapshot),
    [currentSnapshot, savedSnapshot],
  );

  const canSave = isDirty && name.trim().length > 0 && !saving && !uploading;

  const persist = async (extra?: Partial<Profile>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          title,
          bio,
          company,
          location,
          linkedin_url: linkedinUrl,
          website_url: websiteUrl,
          avatar_url: extra?.avatar_url !== undefined ? extra.avatar_url : avatarUrl,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to save profile");
      }
      const updated = (await res.json()) as Profile;
      queryClient.setQueryData(["profile"], updated);
      setAvatarUrl(updated.avatar_url);
      toast.success("Profile saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const openCropper = (file: File) => {
    try {
      assertImageFile(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid image");
      return;
    }
    if (cropObjectUrlRef.current) URL.revokeObjectURL(cropObjectUrlRef.current);
    const url = URL.createObjectURL(file);
    cropObjectUrlRef.current = url;
    setCropSrc(url);
    setCropOpen(true);
  };

  const handleCropped = async (file: File) => {
    setUploading(true);
    try {
      if (isDemoMode()) {
        const demoUrl = URL.createObjectURL(file);
        setAvatarUrl(demoUrl);
        await persist({ avatar_url: demoUrl });
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to upload a photo");
      const url = await uploadPublicImage(supabase, "avatars", user.id, file);
      setAvatarUrl(url);
      await persist({ avatar_url: url });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative shrink-0">
          <button
            type="button"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              if (avatarUrl) setPreviewOpen(true);
              else fileInputRef.current?.click();
            }}
            aria-label={avatarUrl ? "Preview profile photo" : "Add profile photo"}
          >
            <UserAvatar
              name={name || profile.email}
              email={profile.email}
              src={avatarUrl}
              className="h-20 w-20 cursor-pointer text-lg"
              fallbackClassName="text-lg"
            />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) openCropper(file);
            }}
          />
          <button
            type="button"
            disabled={saving || uploading}
            aria-label="Change profile photo"
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <Button variant="link" className="h-auto p-0 text-xs" asChild>
          <Link href={`/profile/${profile.id}`}>
            View how others see your profile
            <ExternalLink className="ml-1 inline h-3 w-3" />
          </Link>
        </Button>
      </div>

      <AvatarCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open && cropObjectUrlRef.current) {
            URL.revokeObjectURL(cropObjectUrlRef.current);
            cropObjectUrlRef.current = null;
            setCropSrc(null);
          }
        }}
        onCropped={handleCropped}
      />

      <AvatarPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        src={avatarUrl}
        name={name || profile.name}
        email={profile.email}
      />

      <div className="space-y-2">
        <Label required>Full name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={profile.email} disabled type="email" />
      </div>
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          placeholder="e.g. CEO at Acme Ventures"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Company</Label>
        <Input
          placeholder="Company or organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input
          placeholder="City, country"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Bio</Label>
        <Textarea
          placeholder="Short intro teammates and collaborators will see"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label>LinkedIn URL</Label>
        <Input
          placeholder="https://linkedin.com/in/…"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Website</Label>
        <Input
          placeholder="https://"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />
      </div>
      <Button
        onClick={() => void persist()}
        disabled={!canSave}
        className={compact ? "w-full rounded-xl" : undefined}
      >
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}
