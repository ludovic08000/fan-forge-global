-- Drop restrictive policy and replace with one allowing all authenticated users to see active stories
DROP POLICY IF EXISTS "Subscribers can view active stories" ON public.creator_stories;

CREATE POLICY "Authenticated users can view active stories"
  ON public.creator_stories FOR SELECT
  TO authenticated
  USING (expires_at > now());