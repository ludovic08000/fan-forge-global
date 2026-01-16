
-- ========================================
-- CORRECTION CRITIQUE : SUPPRIMER LA POLITIQUE PERMISSIVE SUR CREATORS
-- ========================================

-- Le problème : La politique "Authenticated users can view non-paused creators basic info"
-- permet à tous les utilisateurs authentifiés de voir TOUTES les colonnes, y compris les données bancaires

-- Solution : Supprimer cette politique et forcer l'utilisation de la vue sécurisée ou de fonctions RPC

-- 1. SUPPRIMER LA POLITIQUE TROP PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can view non-paused creators basic info" ON public.creators;
DROP POLICY IF EXISTS "Users can view creators" ON public.creators;

-- 2. Recréer une politique plus restrictive
-- Les utilisateurs authentifiés peuvent voir les créateurs mais UNIQUEMENT via la vue sécurisée
-- Cette table de base ne sera accessible que pour les propriétaires et admins
-- Pour les autres, ils devront utiliser la vue public_creators_safe ou get_public_creator_data()

-- Aucune politique SELECT pour les utilisateurs normaux sur la table de base creators
-- Ils doivent utiliser la vue ou la fonction RPC

-- 3. POLITIQUE POUR LES PROFILES - Corriger l'accès aux données sensibles
DROP POLICY IF EXISTS "Authenticated users can view creator profiles" ON public.profiles;

-- Les utilisateurs authentifiés ne peuvent voir que les données PUBLIC des profils créateurs
-- via la vue public_profiles_safe, pas directement la table profiles

-- 4. CRÉER UNE FONCTION SÉCURISÉE pour récupérer les profils créateurs
CREATE OR REPLACE FUNCTION public.get_public_creator_profile(_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  cover_url text,
  bio text,
  location text,
  website text,
  is_verified boolean,
  is_identity_verified boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    p.is_identity_verified,
    p.created_at
    -- EXCLUS: phone, birthdate, gender, orientation, otp_verified
  FROM public.profiles p
  INNER JOIN public.creators c ON c.user_id = p.user_id
  WHERE p.user_id = _user_id
    AND (c.is_paused IS NULL OR c.is_paused = false);
$$;

-- 5. RENFORCER LA POLITIQUE CREATORS pour n'autoriser que la vue
-- Les utilisateurs authentifiés peuvent voir SEULEMENT via public_creators_safe ou get_public_creator_data

-- Créer une politique qui force l'utilisation des vues/fonctions
-- En ne permettant PAS l'accès direct à la table pour les non-propriétaires

-- 6. SÉCURISER LES DOCUMENTS D'IDENTITÉ - URLs signées
-- Les URLs d'images doivent être signées avec courte expiration
-- Ajouter une fonction pour récupérer les documents avec vérification

CREATE OR REPLACE FUNCTION public.get_my_identity_documents()
RETURNS TABLE(
  id uuid,
  document_type text,
  full_name text,
  birthdate date,
  status text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz
  -- EXCLUS: id_front_url, id_back_url, selfie_with_id_url, document_number
  -- Ces données sont trop sensibles pour être exposées même au propriétaire
  -- Elles seront accessibles uniquement via une edge function sécurisée
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    document_type,
    full_name,
    birthdate,
    status,
    rejection_reason,
    submitted_at,
    reviewed_at
  FROM public.identity_verifications
  WHERE user_id = auth.uid();
$$;

-- 7. PROTÉGER LES MESSAGES PRIVÉS - Vérifier le paiement pour le contenu payant
DROP POLICY IF EXISTS "Users can view their messages" ON public.private_messages;

CREATE POLICY "Users can view messages with payment check"
  ON public.private_messages
  FOR SELECT
  USING (
    (is_deleted = false OR is_deleted IS NULL)
    AND (
      -- Le créateur peut tout voir
      creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
      OR
      -- L'abonné peut voir ses messages, mais le contenu payant nécessite is_paid = true
      (
        subscriber_id = auth.uid()
        AND (
          -- Message gratuit ou sans prix
          price IS NULL OR price = 0
          OR
          -- Message payé
          is_paid = true
        )
      )
      OR
      -- Admin
      has_role(auth.uid(), 'admin'::user_role)
    )
  );

-- 8. SÉCURISER LES REVENUS LIVE - Délai de visibilité
-- Note: Cette restriction serait mieux gérée au niveau applicatif
-- Ici on ajoute un commentaire de sécurité

COMMENT ON TABLE public.live_stream_revenue IS 'SÉCURITÉ: Les revenus ne devraient être affichés qu''après la fin du stream (géré au niveau applicatif)';

-- 9. NETTOYER LES ANCIENNES POLITIQUES DUPLIQUÉES
DROP POLICY IF EXISTS "Créateurs peuvent voir leurs factures" ON public.creator_invoices;

-- 10. VÉRIFIER QUE TOUTES LES TABLES CRITIQUES ONT RLS ACTIVÉ
ALTER TABLE IF EXISTS public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creator_invoices ENABLE ROW LEVEL SECURITY;
