-- Corriger les vues SECURITY DEFINER en les recréant avec SECURITY INVOKER

-- Supprimer et recréer la vue public_creator_profiles avec SECURITY INVOKER
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

-- Supprimer et recréer la vue public_creators avec SECURITY INVOKER
DROP VIEW IF EXISTS public.public_creators;

CREATE VIEW public.public_creators 
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.user_id,
  c.stage_name,
  c.category,
  c.subscription_price,
  c.currency,
  c.is_featured,
  c.featured_until,
  c.total_subscribers,
  c.total_content,
  c.is_accepting_tips,
  c.gender,
  c.orientation,
  c.content_type,
  c.created_at
FROM public.creators c;