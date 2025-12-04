-- Add gender and orientation to profiles table for all users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS orientation text;

-- Create storage bucket for user location photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for user-photos bucket
CREATE POLICY "Users can upload their own photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'user-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create user_photos table for location photos
CREATE TABLE IF NOT EXISTS public.user_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  description text,
  location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own photos"
ON public.user_photos
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can view all photos"
ON public.user_photos
FOR SELECT
USING (true);

-- Function to check if user is adult (18+)
CREATE OR REPLACE FUNCTION public.is_user_adult(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND birthdate IS NOT NULL
      AND birthdate <= (CURRENT_DATE - INTERVAL '18 years')
  )
$$;