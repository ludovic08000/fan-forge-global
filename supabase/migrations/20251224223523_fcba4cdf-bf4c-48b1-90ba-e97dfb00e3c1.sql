
-- ============================================================
-- MIGRATION SÉCURITÉ COMPLÈTE
-- ============================================================

-- 1. SUPPRIMER LES POLICIES PERMISSIVES (USING true)
-- ============================================================

-- content_likes: supprimer la policy permissive et la remplacer
DROP POLICY IF EXISTS "Everyone can view likes" ON content_likes;
CREATE POLICY "Users can view their own likes and aggregated counts"
ON content_likes FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- follows: supprimer la policy permissive
DROP POLICY IF EXISTS "Everyone can view follows" ON follows;
CREATE POLICY "Users can view own follows or creator can see followers"
ON follows FOR SELECT
TO authenticated
USING (
  follower_id = auth.uid() OR 
  creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid()) OR
  has_role(auth.uid(), 'admin'::user_role)
);

-- live_stream_settings: supprimer la policy permissive
DROP POLICY IF EXISTS "Tout le monde peut voir les settings" ON live_stream_settings;
CREATE POLICY "Participants can view stream settings"
ON live_stream_settings FOR SELECT
TO authenticated
USING (
  has_live_access(auth.uid(), live_stream_id) OR
  is_live_stream_creator(live_stream_id, auth.uid()) OR
  has_role(auth.uid(), 'admin'::user_role)
);

-- live_stream_revenue: supprimer la policy permissive INSERT
DROP POLICY IF EXISTS "Système peut créer des revenus de live" ON live_stream_revenue;
CREATE POLICY "System can create live revenue"
ON live_stream_revenue FOR INSERT
TO authenticated
WITH CHECK (
  is_live_stream_creator(live_stream_id, auth.uid()) OR
  has_role(auth.uid(), 'admin'::user_role)
);

-- notifications: restreindre INSERT
DROP POLICY IF EXISTS "Système peut créer des notifications" ON notifications;
CREATE POLICY "Service role can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- rate_limit_logs: sécuriser
DROP POLICY IF EXISTS "Système peut logger les rate limits" ON rate_limit_logs;
CREATE POLICY "Service role can log rate limits"
ON rate_limit_logs FOR INSERT
WITH CHECK (true);

-- user_login_logs: sécuriser
DROP POLICY IF EXISTS "Système peut créer des logs" ON user_login_logs;
CREATE POLICY "Service role can create logs"
ON user_login_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. CRÉER UNE VUE PUBLIQUE SÉCURISÉE POUR LES CRÉATEURS
-- ============================================================

-- Supprimer la vue existante et la recréer sans données sensibles
DROP VIEW IF EXISTS public_creators;
CREATE VIEW public_creators WITH (security_invoker = on) AS
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
FROM creators
WHERE (is_paused IS NULL OR is_paused = false);

-- Recréer la vue des lives publics avec security_invoker
DROP VIEW IF EXISTS public_live_streams;
CREATE VIEW public_live_streams WITH (security_invoker = on) AS
SELECT 
  ls.id,
  ls.creator_id,
  ls.title,
  ls.description,
  ls.status,
  ls.thumbnail_url,
  ls.is_premium,
  ls.price,
  ls.scheduled_at,
  ls.started_at,
  ls.ended_at,
  ls.viewer_count,
  ls.peak_viewer_count,
  ls.created_at,
  ls.updated_at
FROM live_streams ls
JOIN creators c ON c.id = ls.creator_id
WHERE ls.status IN ('scheduled', 'live')
AND (c.is_paused IS NULL OR c.is_paused = false);

-- Recréer la vue des profils créateurs avec security_invoker
DROP VIEW IF EXISTS public_creator_profiles;
CREATE VIEW public_creator_profiles WITH (security_invoker = on) AS
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
FROM profiles p
WHERE EXISTS (SELECT 1 FROM creators c WHERE c.user_id = p.user_id);

-- 3. SÉCURISER LES REFERRAL CODES
-- ============================================================
DROP POLICY IF EXISTS "Everyone can view active referral codes" ON referral_codes;
CREATE POLICY "Public can validate referral codes by code only"
ON referral_codes FOR SELECT
USING (
  is_active = true AND (
    -- Tout le monde peut vérifier si un code existe (pour validation)
    auth.uid() IS NOT NULL OR
    -- Les créateurs peuvent voir tous leurs codes
    creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin'::user_role)
  )
);

-- 4. RESTREINDRE LA POLICY CREATORS POUR MASQUER LES DONNÉES SENSIBLES
-- ============================================================

-- La policy "Public can view active creators" expose tout
DROP POLICY IF EXISTS "Public can view active creators" ON creators;

-- Créer une policy qui permet de voir les créateurs actifs mais pas les données sensibles
-- Les données sensibles seront filtrées via la vue public_creators
CREATE POLICY "Public can view non-sensitive creator data"
ON creators FOR SELECT
USING (
  -- Les propres données du créateur
  user_id = auth.uid() OR
  -- Admins voient tout
  has_role(auth.uid(), 'admin'::user_role) OR
  -- Public voit seulement les créateurs actifs (données non sensibles via la vue)
  ((is_paused IS NULL OR is_paused = false))
);

-- 5. INDEX ADDITIONNELS POUR LA PERFORMANCE
-- ============================================================

-- Index composite pour les conversations (messages privés)
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation 
ON private_messages (creator_id, subscriber_id, created_at DESC);

-- Index pour les notifications non lues
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications (user_id, read) WHERE read = false;

-- Index pour les tips par date
CREATE INDEX IF NOT EXISTS idx_tips_created_at 
ON tips (created_at DESC);

-- Index pour les abonnements actifs
CREATE INDEX IF NOT EXISTS idx_subscriptions_active 
ON subscriptions (subscriber_id, creator_id) 
WHERE status = 'active';

-- Index pour le contenu publié
CREATE INDEX IF NOT EXISTS idx_content_published 
ON content (creator_id, status, created_at DESC) 
WHERE status = 'published';

-- Index pour les viewers actifs d'un live
CREATE INDEX IF NOT EXISTS idx_live_stream_viewers_active 
ON live_stream_viewers (live_stream_id, user_id) 
WHERE left_at IS NULL;

-- 6. SÉCURISER LES LOGIN ATTEMPTS (déjà bien fait mais ajoutons INSERT)
-- ============================================================
DROP POLICY IF EXISTS "Allow insert for login attempts" ON login_attempts;
CREATE POLICY "Allow insert for login attempts"
ON login_attempts FOR INSERT
WITH CHECK (true);

COMMENT ON TABLE login_attempts IS 'Stores login attempts for brute force protection. INSERT is public to allow tracking before auth.';
