
-- ============================================
-- FIX 1: Create public view for live_streams without sensitive data
-- ============================================

-- Drop if exists and recreate
DROP VIEW IF EXISTS public_live_streams;

CREATE VIEW public_live_streams AS
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
  -- EXCLUDED: stream_key, recording_url, enable_recording, last_heartbeat
FROM live_streams
WHERE status IN ('scheduled', 'live');

-- Grant SELECT on view to public (for discovery without exposing sensitive data)
GRANT SELECT ON public_live_streams TO anon, authenticated;

-- ============================================
-- FIX 2: Update live_streams policies - require authentication for direct table access
-- ============================================

-- Drop the problematic public policy that exposes stream_key
DROP POLICY IF EXISTS "Public view free live streams" ON live_streams;

-- Recreate with authentication requirement (free streams visible to authenticated users only)
CREATE POLICY "Authenticated users can view free live streams"
ON live_streams
FOR SELECT
TO authenticated
USING (is_premium = false);

-- ============================================
-- FIX 3: Fix live_stream_messages policies
-- ============================================

-- Drop the problematic public role policy
DROP POLICY IF EXISTS "Users with live access can view messages" ON live_stream_messages;

-- Recreate for authenticated users only
CREATE POLICY "Authenticated users with live access can view messages"
ON live_stream_messages
FOR SELECT
TO authenticated
USING (has_live_access(auth.uid(), live_stream_id));

-- ============================================
-- FIX 4: Ensure stream_key is only visible to creator via secure function
-- ============================================

CREATE OR REPLACE FUNCTION public.get_own_stream_key(_live_stream_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ls.stream_key
  FROM live_streams ls
  JOIN creators c ON c.id = ls.creator_id
  WHERE ls.id = _live_stream_id
    AND c.user_id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_own_stream_key(uuid) TO authenticated;
