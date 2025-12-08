-- =====================================================
-- CORRECTION SÉCURITÉ: Restriction accès données sensibles
-- =====================================================

-- 1. Supprimer la politique trop permissive sur creators
DROP POLICY IF EXISTS "Public can view public creator data" ON public.creators;

-- 2. Créer une politique restrictive pour creators
-- Seuls les admins et le créateur lui-même peuvent voir les données sensibles
CREATE POLICY "Creators can view own sensitive data"
ON public.creators
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- 3. Créer/mettre à jour la vue publique pour les créateurs (sans données sensibles)
DROP VIEW IF EXISTS public.public_creators;
CREATE VIEW public.public_creators AS
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
  -- Exclus: bank_iban, bank_bic, bank_account_holder, bank_country,
  --         stripe_account_id, stripe_account_status, stripe_*, tax_id,
  --         total_earnings, platform_commission_rate, payment_frequency
FROM public.creators;

-- 4. Donner accès SELECT à la vue publique pour tout le monde
GRANT SELECT ON public.public_creators TO anon, authenticated;

-- 5. Supprimer la politique trop permissive sur profiles
DROP POLICY IF EXISTS "Authenticated users can view public profile data" ON public.profiles;

-- 6. Créer des politiques granulaires pour profiles
-- Les utilisateurs peuvent voir leur propre profil complet
CREATE POLICY "Users can view own complete profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Les admins peuvent voir tous les profils
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Créer une vue publique pour les profils (sans données sensibles)
DROP VIEW IF EXISTS public.public_creator_profiles;
CREATE VIEW public.public_creator_profiles AS
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
  -- Exclus: phone, birthdate, gender, orientation (données sensibles/privées)
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.creators c WHERE c.user_id = p.user_id
);

-- 7. Donner accès SELECT à la vue publique des profils créateurs
GRANT SELECT ON public.public_creator_profiles TO anon, authenticated;

-- 8. Créer une politique pour permettre aux utilisateurs authentifiés 
-- de voir les profils publics des créateurs (via la vue)
CREATE POLICY "Authenticated users can view creator profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.creators c WHERE c.user_id = profiles.user_id
  )
  AND auth.uid() IS NOT NULL
);