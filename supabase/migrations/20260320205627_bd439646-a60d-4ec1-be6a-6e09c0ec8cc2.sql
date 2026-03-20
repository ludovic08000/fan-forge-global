-- NOTE: La migration précédente a REVOKE mais pas GRANT (erreur de colonne)
-- Il faut d'abord restaurer les SELECT puis refaire proprement

-- Restaurer les grants (les REVOKE ont été appliqués)
GRANT SELECT ON public.creators TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

-- Maintenant re-révoquer et appliquer les grants par colonne

-- === CREATORS ===
REVOKE SELECT ON public.creators FROM anon;
REVOKE SELECT ON public.creators FROM authenticated;

GRANT SELECT (
  id, user_id, stage_name, category, categories, subscription_price, 
  currency, is_featured, featured_until, total_subscribers, total_content,
  is_accepting_tips, gender, orientation, content_type, created_at, 
  updated_at, is_paused, noshow_count, noshow_penalty_level,
  visibility_reduced, lives_blocked_until, platform_commission_rate
) ON public.creators TO anon, authenticated;

GRANT SELECT ON public.creators TO service_role;

-- === PROFILES ===
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id, user_id, username, display_name, avatar_url, cover_url, 
  bio, location, website, is_verified, is_identity_verified, 
  created_at, cover_position, cover_position_x,
  instagram_url, twitter_url, tiktok_url, youtube_url
) ON public.profiles TO anon, authenticated;

GRANT SELECT ON public.profiles TO service_role;