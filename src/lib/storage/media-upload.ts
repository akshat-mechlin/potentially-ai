import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

export type MediaBucket = "avatars" | "workspace-logos";

function extensionForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export function assertImageFile(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use a JPG, PNG, WEBP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }
}

/** Upload under `{folderId}/avatar|logo.{ext}` and return a cache-busted public URL. */
export async function uploadPublicImage(
  supabase: SupabaseClient,
  bucket: MediaBucket,
  folderId: string,
  file: File,
) {
  assertImageFile(file);
  const ext = extensionForMime(file.type);
  const objectName = bucket === "avatars" ? `avatar.${ext}` : `logo.${ext}`;
  const path = `${folderId}/${objectName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const url = new URL(data.publicUrl);
  url.searchParams.set("v", String(Date.now()));
  return url.toString();
}
