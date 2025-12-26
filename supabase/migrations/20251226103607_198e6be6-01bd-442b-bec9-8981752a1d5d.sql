-- Fix storage RLS policy for content bucket to allow creators to upload paid media
-- Drop existing policies first if they exist, then create new ones

-- Drop existing insert policy if exists
DROP POLICY IF EXISTS "Authenticated users can upload content" ON storage.objects;
DROP POLICY IF EXISTS "content_insert_policy" ON storage.objects;

-- Create insert policy for authenticated users
CREATE POLICY "content_insert_policy"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'content' 
  AND auth.role() = 'authenticated'
);

-- Drop and recreate select policy
DROP POLICY IF EXISTS "Users can view content" ON storage.objects;
DROP POLICY IF EXISTS "content_select_policy" ON storage.objects;

CREATE POLICY "content_select_policy"
ON storage.objects
FOR SELECT
USING (bucket_id = 'content');

-- Drop and recreate update policy
DROP POLICY IF EXISTS "Users can update own content" ON storage.objects;
DROP POLICY IF EXISTS "content_update_policy" ON storage.objects;

CREATE POLICY "content_update_policy"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'content' AND auth.role() = 'authenticated');

-- Drop and recreate delete policy
DROP POLICY IF EXISTS "Users can delete own content" ON storage.objects;
DROP POLICY IF EXISTS "content_delete_policy" ON storage.objects;

CREATE POLICY "content_delete_policy"
ON storage.objects
FOR DELETE
USING (bucket_id = 'content' AND auth.role() = 'authenticated');