
-- Fix the SECURITY DEFINER view issue by explicitly setting SECURITY INVOKER
-- This ensures the view respects the RLS policies of the querying user

DROP VIEW IF EXISTS public_live_streams;

CREATE VIEW public_live_streams 
WITH (security_invoker = on)
AS
SELECT 
  id,
  creator_id,
  title,
  description,
  status,
  thumbnail_url,
  is_premium,
  price,
  scheduled_at,
  started_at,
  ended_at,
  viewer_count,
  peak_viewer_count,
  created_at,
  updated_at
FROM live_streams
WHERE status IN ('scheduled', 'live');

-- Grant SELECT on view to public
GRANT SELECT ON public_live_streams TO anon, authenticated;
