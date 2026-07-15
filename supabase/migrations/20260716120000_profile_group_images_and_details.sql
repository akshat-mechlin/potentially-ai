-- Extra profile fields for richer public profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Public image buckets (avatars + group logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'workspace-logos',
    'workspace-logos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatars: public read; users manage their own folder
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Workspace logos: public read; owners/admins manage folder named by workspace id
DROP POLICY IF EXISTS "Workspace logos are publicly accessible" ON storage.objects;
CREATE POLICY "Workspace logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'workspace-logos');

DROP POLICY IF EXISTS "Workspace admins can upload logos" ON storage.objects;
CREATE POLICY "Workspace admins can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'workspace-logos'
  AND public.get_workspace_role(((storage.foldername(name))[1])::uuid) IN ('owner', 'admin')
);

DROP POLICY IF EXISTS "Workspace admins can update logos" ON storage.objects;
CREATE POLICY "Workspace admins can update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'workspace-logos'
  AND public.get_workspace_role(((storage.foldername(name))[1])::uuid) IN ('owner', 'admin')
)
WITH CHECK (
  bucket_id = 'workspace-logos'
  AND public.get_workspace_role(((storage.foldername(name))[1])::uuid) IN ('owner', 'admin')
);

DROP POLICY IF EXISTS "Workspace admins can delete logos" ON storage.objects;
CREATE POLICY "Workspace admins can delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'workspace-logos'
  AND public.get_workspace_role(((storage.foldername(name))[1])::uuid) IN ('owner', 'admin')
);
