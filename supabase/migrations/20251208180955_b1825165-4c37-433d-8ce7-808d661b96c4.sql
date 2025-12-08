-- =====================================================
-- CORRECTION: Vues avec SECURITY INVOKER (pas DEFINER)
-- =====================================================

-- Recréer les vues avec security_invoker = true
DROP VIEW IF EXISTS public.public_creators;
CREATE VIEW public.public_creators 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  stage_name,
  category,
  subscription_price,
  currency,
  is_featured,
  featured_until,
  total_subscribers,
  total_content,
  is_accepting_tips,
  gender,
  orientation,
  content_type,
  created_at
FROM public.creators;

-- Recréer la vue des profils avec security_invoker = true
DROP VIEW IF EXISTS public.public_creator_profiles;
CREATE VIEW public.public_creator_profiles 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.cover_url,
  p.bio,
  p.location,
  p.website,
  p.is_verified,
  p.created_at
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.creators c WHERE c.user_id = p.user_id
);

-- Redonner les permissions
GRANT SELECT ON public.public_creators TO anon, authenticated;
GRANT SELECT ON public.public_creator_profiles TO anon, authenticated;