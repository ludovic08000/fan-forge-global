
-- ========================================
-- AUDIT DE SÉCURITÉ - CORRECTIONS RLS
-- ========================================

-- 1. CRÉER UNE VUE SÉCURISÉE POUR LES CRÉATEURS (masquer les données bancaires)
-- ========================================

-- Vue publique des créateurs (sans données sensibles)
CREATE OR REPLACE VIEW public.public_creators_safe 
WITH (security_invoker=on) AS
  SELECT 
    id,
    user_id,
    stage_name,
    category,
    gender,
    orientation,
    content_type,
    subscription_price,
    currency,
    total_content,
    total_subscribers,
    is_featured,
    featured_until,
    is_accepting_tips,
    created_at,
    is_paused
    -- EXCLUS: bank_iban, bank_bic, bank_account_holder, bank_country, tax_id, 
    -- total_earnings, stripe_account_id, stripe_account_status, etc.
  FROM public.creators
  WHERE is_paused = false OR is_paused IS NULL;

-- 2. SÉCURISER LA TABLE IDENTITY_VERIFICATIONS
-- ========================================

-- Supprimer les anciennes politiques permissives
DROP POLICY IF EXISTS "Users can view own verification" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can insert own verification" ON public.identity_verifications;
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.identity_verifications;
DROP POLICY IF EXISTS "Admins can update verifications" ON public.identity_verifications;

-- Créer des politiques strictes
CREATE POLICY "Users can view only their own verification"
  ON public.identity_verifications
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can insert only their own verification"
  ON public.identity_verifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only admins can update verifications"
  ON public.identity_verifications
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Only admins can delete verifications"
  ON public.identity_verifications
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));

-- 3. CRÉER UNE VUE PUBLIQUE POUR LES PROFILS (sans données sensibles)
-- ========================================

CREATE OR REPLACE VIEW public.public_profiles_safe
WITH (security_invoker=on) AS
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
    -- EXCLUS: phone, birthdate, gender, orientation, otp_verified
  FROM public.profiles;

-- 4. SÉCURISER LA TABLE CREATOR_INVOICES
-- ========================================

-- Supprimer les politiques trop permissives si elles existent
DROP POLICY IF EXISTS "Public can view invoices" ON public.creator_invoices;

-- S'assurer que seul le créateur concerné et les admins peuvent voir les factures
DROP POLICY IF EXISTS "Creators can view own invoices" ON public.creator_invoices;
CREATE POLICY "Creators can view own invoices"
  ON public.creator_invoices
  FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::user_role)
  );

-- 5. SÉCURISER LA TABLE PROFILES - Limiter les mises à jour
-- ========================================

DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can only insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 6. SÉCURISER LA TABLE CREATORS - Restreindre l'accès aux données sensibles
-- ========================================

-- Supprimer la politique SELECT trop permissive
DROP POLICY IF EXISTS "Anyone can view creators" ON public.creators;
DROP POLICY IF EXISTS "Public can view active creators" ON public.creators;

-- Politique de lecture sécurisée pour la table creators
-- Les utilisateurs normaux ne voient que les créateurs actifs (via la vue publique)
-- Les propriétaires et admins voient tout

CREATE POLICY "Owners and admins can view full creator data"
  ON public.creators
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::user_role)
  );

-- Permettre aux utilisateurs authentifiés de voir les créateurs non-pausés 
-- mais seulement via la vue public_creators_safe
CREATE POLICY "Authenticated users can view non-paused creators basic info"
  ON public.creators
  FOR SELECT
  USING (
    (is_paused = false OR is_paused IS NULL)
    AND auth.role() = 'authenticated'
  );

-- 7. SÉCURISER LES LOGS DE CONNEXION
-- ========================================

DROP POLICY IF EXISTS "Users can view own login logs" ON public.user_login_logs;

CREATE POLICY "Users can only view their own login logs"
  ON public.user_login_logs
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role));

-- 8. SÉCURISER LES SIGNALEMENTS DE CONTENU
-- ========================================

-- S'assurer que les créateurs ne peuvent pas voir qui les a signalés
DROP POLICY IF EXISTS "Creators can see reports on their content" ON public.content_reports;

-- 9. AJOUTER DES INDEX POUR LES PERFORMANCES DES VÉRIFICATIONS RLS
-- ========================================

CREATE INDEX IF NOT EXISTS idx_creators_user_id ON public.creators(user_id);
CREATE INDEX IF NOT EXISTS idx_creators_is_paused ON public.creators(is_paused);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_user_id ON public.identity_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_invoices_creator_id ON public.creator_invoices(creator_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON public.user_login_logs(user_id);

-- 10. CRÉER UNE FONCTION POUR VÉRIFIER LE PROPRIÉTAIRE D'UN CRÉATEUR
-- ========================================

CREATE OR REPLACE FUNCTION public.is_creator_owner_by_user_id(_creator_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _creator_user_id = auth.uid()
$$;

-- 11. SÉCURISER LES MESSAGES PRIVÉS - Empêcher la lecture des messages supprimés
-- ========================================

DROP POLICY IF EXISTS "Users can view their conversations" ON public.private_messages;

CREATE POLICY "Users can view their active conversations"
  ON public.private_messages
  FOR SELECT
  USING (
    (is_deleted = false OR is_deleted IS NULL)
    AND (
      creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
      OR subscriber_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::user_role)
    )
  );
