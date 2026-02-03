-- =====================================================
-- CORRECTION SÉCURITÉ: Supprimer les policies trop permissives sur profiles
-- =====================================================

-- Supprimer la policy trop permissive qui expose TOUTES les colonnes
DROP POLICY IF EXISTS "Authenticated users can view public profile data" ON public.profiles;

-- Supprimer aussi l'ancienne policy "creator profiles" si elle existe encore
DROP POLICY IF EXISTS "Authenticated users can view creator profiles" ON public.profiles;

-- Supprimer les doublons de policies INSERT
DROP POLICY IF EXISTS "Users can only insert their own profile" ON public.profiles;

-- =====================================================
-- NOUVELLES POLICIES RESTRICTIVES
-- =====================================================

-- Les utilisateurs peuvent voir uniquement leur propre profil complet
-- (Cette policy existe déjà mais on la recrée pour être sûr)
DROP POLICY IF EXISTS "Users can view own complete profile" ON public.profiles;
CREATE POLICY "Users can view own complete profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Les admins peuvent voir tous les profils (existe déjà)
-- DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
-- CREATE POLICY "Admins can view all profiles"
-- ON public.profiles
-- FOR SELECT
-- USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- ACCÈS PUBLIC SÉCURISÉ VIA VUE OU FONCTION RPC
-- Pour les données publiques des créateurs, utiliser:
-- - La vue public_profiles_safe (déjà créée)
-- - La fonction get_public_creator_profile() (déjà créée)
-- =====================================================

-- Vérifier que la vue public_profiles_safe existe et est correcte
CREATE OR REPLACE VIEW public.public_profiles_safe AS
SELECT 
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  cover_url,
  bio,
  location,
  website,
  is_verified,
  is_identity_verified,
  created_at
  -- EXCLUS: phone, birthdate, gender, orientation, otp_verified, 
  -- terms_accepted_at, privacy_accepted_at, terms_version, privacy_version
FROM public.profiles;

-- Sécuriser la vue avec security_invoker pour respecter les RLS
ALTER VIEW public.public_profiles_safe SET (security_invoker = true);

COMMENT ON VIEW public.public_profiles_safe IS 
'Vue sécurisée des profils excluant les données personnelles sensibles. 
Utiliser cette vue ou get_public_creator_profile() pour accéder aux profils publics.';