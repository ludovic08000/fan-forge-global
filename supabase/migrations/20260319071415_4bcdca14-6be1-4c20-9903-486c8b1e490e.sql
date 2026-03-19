-- Allow anonymous and authenticated users to view public creator profiles
-- This enables profile sharing via links like theforge.fans/username

-- Allow anyone to see active creators' basic info (via public_creators view)
CREATE POLICY "Anyone can view active creators public info"
ON public.creators
FOR SELECT
TO anon, authenticated
USING ((is_paused IS NULL OR is_paused = false));

-- Allow anyone to see creator profiles (via public_creator_profiles view)  
CREATE POLICY "Anyone can view creator profiles public info"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.user_id = profiles.user_id
    AND (c.is_paused IS NULL OR c.is_paused = false)
  )
);

-- Drop the old restrictive policies that required auth
DROP POLICY IF EXISTS "Authenticated users can view active creators" ON public.creators;
DROP POLICY IF EXISTS "Authenticated users can view creator profiles for public displa" ON public.profiles;