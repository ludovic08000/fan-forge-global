
-- Add categories array column to creators
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS categories text[] DEFAULT ARRAY[]::text[];

-- Migrate existing category data into categories array
UPDATE public.creators 
SET categories = ARRAY[category]
WHERE category IS NOT NULL AND category != '' AND (categories IS NULL OR categories = ARRAY[]::text[]);

-- Update the search_creators function to support categories array
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
  total_subscribers integer, total_content integer,
  created_at timestamp with time zone, display_name text,
  username text, avatar_url text, bio text, is_verified boolean,
  similarity_score double precision, gender text, orientation text,
  content_type text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
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
    (search_term = '' OR (
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
$function$;
