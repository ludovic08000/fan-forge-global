-- Fix 1: Change search_creators to add authentication check (keep DEFINER for performance with similarity)
-- Drop the newer overload first, then the older one, then recreate with auth check

DROP FUNCTION IF EXISTS public.search_creators(text, text, text, boolean, text, text, text[], integer, integer);
DROP FUNCTION IF EXISTS public.search_creators(text, text, text, boolean, integer, integer);

CREATE OR REPLACE FUNCTION public.search_creators(
  search_term text DEFAULT ''::text,
  category_filter text DEFAULT NULL::text,
  price_filter text DEFAULT 'all'::text,
  featured_only boolean DEFAULT false,
  gender_filter text DEFAULT NULL::text,
  orientation_filter text DEFAULT NULL::text,
  content_type_filter text[] DEFAULT NULL::text[],
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, stage_name text, category text,
  subscription_price numeric, currency text, is_featured boolean,
  total_subscribers integer, total_content integer, created_at timestamp with time zone,
  display_name text, username text, avatar_url text, bio text, is_verified boolean,
  similarity_score double precision, gender text, orientation text, content_type text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT 
    c.id, c.user_id, c.stage_name, c.category,
    c.subscription_price, c.currency, c.is_featured,
    c.total_subscribers, c.total_content, c.created_at,
    p.display_name, p.username, p.avatar_url, p.bio, p.is_verified,
    CASE 
      WHEN search_term = '' THEN 1.0::double precision
      ELSE (
        extensions.similarity(COALESCE(c.stage_name, ''), search_term) * 0.4 +
        extensions.similarity(COALESCE(p.display_name, ''), search_term) * 0.3 +
        extensions.similarity(COALESCE(p.username, ''), search_term) * 0.2 +
        extensions.similarity(COALESCE(c.category, ''), search_term) * 0.1
      )::double precision
    END as similarity_score,
    c.gender, c.orientation, c.content_type
  FROM creators c
  LEFT JOIN profiles p ON c.user_id = p.user_id
  WHERE 
    (c.is_paused IS NULL OR c.is_paused = false)
    AND (search_term = '' OR (
      c.stage_name ILIKE '%' || search_term || '%' OR
      p.display_name ILIKE '%' || search_term || '%' OR
      p.username ILIKE '%' || search_term || '%' OR
      c.category ILIKE '%' || search_term || '%' OR
      p.bio ILIKE '%' || search_term || '%' OR
      EXISTS (SELECT 1 FROM unnest(c.categories) cat WHERE cat ILIKE '%' || search_term || '%')
    ))
    AND (category_filter IS NULL OR category_filter = ANY(c.categories) OR c.category = category_filter)
    AND (
      price_filter = 'all' OR
      (price_filter = 'free' AND c.subscription_price <= 0) OR
      (price_filter = 'paid' AND c.subscription_price > 0)
    )
    AND (NOT featured_only OR c.is_featured = TRUE)
    AND (gender_filter IS NULL OR c.gender = gender_filter)
    AND (orientation_filter IS NULL OR c.orientation = orientation_filter)
    AND (content_type_filter IS NULL OR c.content_type && content_type_filter)
  ORDER BY 
    c.is_featured DESC,
    similarity_score DESC,
    c.total_subscribers DESC,
    c.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Fix 2: Add unique constraint to prevent duplicate reports
ALTER TABLE content_reports 
ADD CONSTRAINT unique_content_reporter UNIQUE (content_id, reporter_id);

-- Fix 3: Create rate-limiting function for reports
CREATE OR REPLACE FUNCTION public.check_report_rate_limit()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_reports INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_reports
  FROM content_reports
  WHERE reporter_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 hour';
  
  RETURN recent_reports < 10;
END;
$$;

-- Fix 4: Update RLS policy with rate limit
DROP POLICY IF EXISTS "Utilisateurs peuvent créer des signalements" ON content_reports;
CREATE POLICY "Users can create reports with rate limit"
  ON content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid() AND
    check_report_rate_limit()
  );

-- Fix 5: Add index for report rate limit performance
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_recent 
ON content_reports(reporter_id, created_at DESC);
