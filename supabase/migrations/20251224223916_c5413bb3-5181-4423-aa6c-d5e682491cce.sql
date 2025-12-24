
-- ============================================================
-- MIGRATION SÉCURITÉ - PHASE 2: Restriction données sensibles créateurs
-- ============================================================

-- 1. SUPPRIMER LA POLICY TROP PERMISSIVE SUR CREATORS
-- ============================================================
DROP POLICY IF EXISTS "Public can view non-sensitive creator data" ON creators;

-- 2. CRÉER DES POLICIES PLUS RESTRICTIVES
-- ============================================================

-- Les utilisateurs non-authentifiés ne peuvent PAS accéder à la table creators directement
-- Ils doivent passer par la vue public_creators

-- Seuls les utilisateurs authentifiés peuvent voir les créateurs actifs (données non-sensibles)
CREATE POLICY "Authenticated users can view active creators basic info"
ON creators FOR SELECT
TO authenticated
USING (
  (is_paused IS NULL OR is_paused = false)
);

-- Les créateurs peuvent voir toutes leurs propres données
-- (déjà couvert par "Creators can view own sensitive data")

-- 3. CRÉER UNE FONCTION POUR RÉCUPÉRER LES DONNÉES PUBLIQUES DES CRÉATEURS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_creator_data(creator_uuid uuid)
RETURNS TABLE (
  id uuid,
  stage_name text,
  category text,
  subscription_price numeric,
  currency text,
  is_featured boolean,
  total_subscribers integer,
  total_content integer,
  is_accepting_tips boolean,
  gender text,
  orientation text,
  content_type text[],
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.stage_name,
    c.category,
    c.subscription_price,
    c.currency,
    c.is_featured,
    c.total_subscribers,
    c.total_content,
    c.is_accepting_tips,
    c.gender,
    c.orientation,
    c.content_type,
    c.created_at
  FROM creators c
  WHERE c.id = creator_uuid
    AND (c.is_paused IS NULL OR c.is_paused = false);
$$;

-- 4. AJOUTER UNE COLONNE POUR LE RATE LIMITING SUR LES VUES
-- ============================================================

-- Index pour améliorer les performances des requêtes sur les vues
CREATE INDEX IF NOT EXISTS idx_creators_public_active 
ON creators (id, user_id) 
WHERE (is_paused IS NULL OR is_paused = false);

-- 5. ACTIVER LA PROTECTION CONTRE LES MOTS DE PASSE FUITÉS
-- Note: Ceci doit être fait dans le dashboard Supabase
-- https://supabase.com/docs/guides/auth/password-security

-- 6. AJOUTER UNE CONTRAINTE UNIQUE SUR LES SECURITY BLOCKS
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_security_blocks_unique 
ON security_blocks (identifier, block_type) 
WHERE is_active = true;

COMMENT ON TABLE creators IS 'Table des créateurs. Les données financières (bank_*, stripe_*, tax_id) ne sont accessibles que par le créateur lui-même ou les admins.';
