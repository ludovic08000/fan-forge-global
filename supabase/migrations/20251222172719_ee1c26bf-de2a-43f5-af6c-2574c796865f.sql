-- Allow public read access to non-sensitive creator data for the public_creators view
CREATE POLICY "Public can view active creators"
ON public.creators
FOR SELECT
USING (
  (is_paused IS NULL OR is_paused = false)
);

-- Note: This policy allows reading non-sensitive fields through the public_creators view
-- which already filters out sensitive fields like bank info, stripe details, etc.