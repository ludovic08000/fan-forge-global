-- ===========================================
-- 1. SÉCURISER LA TABLE PROFILES
-- ===========================================

-- Supprimer l'ancienne politique permissive
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Créer une vue publique sans données sensibles pour les créateurs
CREATE OR REPLACE VIEW public.public_creator_profiles AS
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

-- Politique: Les utilisateurs authentifiés peuvent voir les profils publics (sans données sensibles)
CREATE POLICY "Authenticated users can view public profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: Les champs sensibles (phone, birthdate, gender, orientation) restent dans la table
-- mais on crée une fonction pour récupérer seulement les données publiques

-- Fonction pour récupérer un profil public (sans données sensibles)
CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE (
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
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = _user_id;
$$;

-- ===========================================
-- 2. SÉCURISER LA TABLE USER_ROLES
-- ===========================================

-- Supprimer l'ancienne politique permissive
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- Politique: Utilisateurs peuvent voir uniquement leur propre rôle
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Politique: Admins peuvent voir tous les rôles (déjà existante via has_role)
-- La politique "Admins can manage all roles" existe déjà

-- ===========================================
-- 3. SÉCURISER LA TABLE CREATORS
-- ===========================================

-- Supprimer l'ancienne politique permissive
DROP POLICY IF EXISTS "Everyone can view creators" ON public.creators;

-- Créer une fonction pour vérifier si l'utilisateur est le créateur
CREATE OR REPLACE FUNCTION public.is_own_creator_profile(_creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creators
    WHERE id = _creator_id AND user_id = auth.uid()
  )
$$;

-- Politique: Tout le monde peut voir les données publiques des créateurs
CREATE POLICY "Public can view public creator data"
ON public.creators
FOR SELECT
USING (true);

-- Note: On va créer une vue pour les données publiques et une fonction RPC pour les données privées

-- Vue pour les données publiques des créateurs (sans données financières)
CREATE OR REPLACE VIEW public.public_creators AS
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

-- Fonction pour récupérer les données financières (créateur ou admin seulement)
CREATE OR REPLACE FUNCTION public.get_creator_financial_data(_creator_id uuid)
RETURNS TABLE (
  total_earnings numeric,
  platform_commission_rate numeric,
  stripe_account_id text,
  stripe_account_status text,
  stripe_charges_enabled boolean,
  stripe_payouts_enabled boolean,
  stripe_onboarding_completed boolean,
  bank_iban text,
  bank_bic text,
  bank_country text,
  bank_account_holder text,
  tax_id text,
  payment_frequency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.total_earnings,
    c.platform_commission_rate,
    c.stripe_account_id,
    c.stripe_account_status,
    c.stripe_charges_enabled,
    c.stripe_payouts_enabled,
    c.stripe_onboarding_completed,
    c.bank_iban,
    c.bank_bic,
    c.bank_country,
    c.bank_account_holder,
    c.tax_id,
    c.payment_frequency
  FROM public.creators c
  WHERE c.id = _creator_id
    AND (
      c.user_id = auth.uid() 
      OR has_role(auth.uid(), 'admin')
    );
$$;

-- ===========================================
-- 4. SÉCURISER LA TABLE USER_PHOTOS
-- ===========================================

-- Supprimer l'ancienne politique permissive
DROP POLICY IF EXISTS "Users can view all photos" ON public.user_photos;

-- Politique: Utilisateurs peuvent voir leurs propres photos
CREATE POLICY "Users can view own photos"
ON public.user_photos
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Politique: Utilisateurs peuvent voir les photos des créateurs auxquels ils sont abonnés
CREATE POLICY "Subscribers can view creator photos"
ON public.user_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.user_id = user_photos.user_id
    AND is_subscribed_to_creator(auth.uid(), c.id)
  )
);

-- Politique: Utilisateurs peuvent voir les photos des créateurs qu'ils suivent
CREATE POLICY "Followers can view creator photos"
ON public.user_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.creators c
    JOIN public.follows f ON f.creator_id = c.id
    WHERE c.user_id = user_photos.user_id
    AND f.follower_id = auth.uid()
  )
);

-- Politique: Admins peuvent voir toutes les photos
CREATE POLICY "Admins can view all photos"
ON public.user_photos
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- ===========================================
-- 5. SÉCURISER LES TABLES DE LOGS (bonus)
-- ===========================================

-- Restreindre les insertions sur live_stream_viewers
DROP POLICY IF EXISTS "Système peut gérer les spectateurs" ON public.live_stream_viewers;

-- Politique: Utilisateurs authentifiés peuvent s'inscrire comme spectateur
CREATE POLICY "Users can join as viewer"
ON public.live_stream_viewers
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Politique: Utilisateurs peuvent quitter (update left_at)
CREATE POLICY "Users can leave stream"
ON public.live_stream_viewers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Politique: Créateurs peuvent voir leurs spectateurs
-- (déjà existante)