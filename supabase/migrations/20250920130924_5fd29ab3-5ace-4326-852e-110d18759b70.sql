-- Optimiser les index pour la recherche
CREATE INDEX IF NOT EXISTS idx_creators_search_name ON public.creators USING gin(to_tsvector('french', COALESCE(stage_name, '') || ' ' || COALESCE(category, '')));
CREATE INDEX IF NOT EXISTS idx_profiles_search_name ON public.profiles USING gin(to_tsvector('french', COALESCE(display_name, '') || ' ' || COALESCE(username, '') || ' ' || COALESCE(bio, '')));
CREATE INDEX IF NOT EXISTS idx_creators_featured ON public.creators(is_featured, total_subscribers DESC);
CREATE INDEX IF NOT EXISTS idx_creators_category ON public.creators(category);
CREATE INDEX IF NOT EXISTS idx_creators_subscription_price ON public.creators(subscription_price);
CREATE INDEX IF NOT EXISTS idx_content_search ON public.content USING gin(to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- Ajouter une colonne tags pour le contenu si elle n'existe pas
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS tags TEXT[];
CREATE INDEX IF NOT EXISTS idx_content_tags ON public.content USING gin(tags);

-- Fonction pour la recherche de créateurs
CREATE OR REPLACE FUNCTION public.search_creators(
  search_term TEXT DEFAULT '',
  category_filter TEXT DEFAULT NULL,
  price_filter TEXT DEFAULT 'all', -- 'free', 'paid', 'all'
  featured_only BOOLEAN DEFAULT FALSE,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  stage_name TEXT,
  category TEXT,
  subscription_price NUMERIC,
  currency TEXT,
  is_featured BOOLEAN,
  total_subscribers INTEGER,
  total_content INTEGER,
  created_at TIMESTAMPTZ,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN,
  similarity_score REAL
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.stage_name,
    c.category,
    c.subscription_price,
    c.currency,
    c.is_featured,
    c.total_subscribers,
    c.total_content,
    c.created_at,
    p.display_name,
    p.username,
    p.avatar_url,
    p.bio,
    p.is_verified,
    CASE 
      WHEN search_term = '' THEN 1.0
      ELSE (
        similarity(COALESCE(c.stage_name, ''), search_term) * 0.4 +
        similarity(COALESCE(p.display_name, ''), search_term) * 0.3 +
        similarity(COALESCE(p.username, ''), search_term) * 0.2 +
        similarity(COALESCE(c.category, ''), search_term) * 0.1
      )
    END as similarity_score
  FROM creators c
  LEFT JOIN profiles p ON c.user_id = p.user_id
  WHERE 
    (search_term = '' OR (
      c.stage_name ILIKE '%' || search_term || '%' OR
      p.display_name ILIKE '%' || search_term || '%' OR
      p.username ILIKE '%' || search_term || '%' OR
      c.category ILIKE '%' || search_term || '%' OR
      p.bio ILIKE '%' || search_term || '%'
    ))
    AND (category_filter IS NULL OR c.category = category_filter)
    AND (
      price_filter = 'all' OR
      (price_filter = 'free' AND c.subscription_price <= 0) OR
      (price_filter = 'paid' AND c.subscription_price > 0)
    )
    AND (NOT featured_only OR c.is_featured = TRUE)
  ORDER BY 
    c.is_featured DESC,
    similarity_score DESC,
    c.total_subscribers DESC,
    c.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Activer l'extension pg_trgm si pas déjà activée
CREATE EXTENSION IF NOT EXISTS pg_trgm;