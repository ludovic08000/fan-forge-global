
-- ========================================
-- CORRECTIONS DES POLITIQUES RLS PERMISSIVES
-- ========================================

-- Ces tables de logging sont utilisées par le backend/service role
-- Nous devons les protéger correctement tout en permettant les insertions nécessaires

-- 1. LOGIN_ATTEMPTS - Utilisée par brute-force-check edge function
-- ========================================
DROP POLICY IF EXISTS "Allow insert for login attempts" ON public.login_attempts;

-- Seul le service role ou les utilisateurs authentifiés peuvent insérer
CREATE POLICY "Authenticated users can log attempts"
  ON public.login_attempts
  FOR INSERT
  WITH CHECK (
    -- Permettre au service role d'insérer (pour edge functions)
    auth.role() = 'service_role'
    OR 
    -- Permettre aux utilisateurs authentifiés de logger leurs propres tentatives
    auth.role() = 'authenticated'
  );

-- Seuls les admins peuvent voir toutes les tentatives
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;
CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- 2. NOTIFICATIONS - Système de notifications
-- ========================================
DROP POLICY IF EXISTS "Service role can create notifications" ON public.notifications;

-- Seul le service role (triggers, edge functions) peut créer des notifications
CREATE POLICY "Only service role can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR
    -- Ou l'utilisateur crée une notification pour lui-même (rare mais possible)
    user_id = auth.uid()
  );

-- Les utilisateurs ne voient que leurs propres notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can only view own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role));

-- Les utilisateurs peuvent modifier (marquer comme lu) leurs propres notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- 3. RATE_LIMIT_LOGS - Utilisée par rate-limit-check edge function
-- ========================================
DROP POLICY IF EXISTS "Service role can log rate limits" ON public.rate_limit_logs;

-- Seul le service role peut insérer (les edge functions utilisent service role)
CREATE POLICY "Only service role can log rate limits"
  ON public.rate_limit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Seuls les admins peuvent voir les logs de rate limit
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.rate_limit_logs;
CREATE POLICY "Only admins can view rate limits"
  ON public.rate_limit_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- 4. USER_LOGIN_LOGS - Logs de connexion utilisateur
-- ========================================
DROP POLICY IF EXISTS "Service role can create logs" ON public.user_login_logs;

-- Seul le service role ou l'utilisateur concerné peut créer
CREATE POLICY "Only service role or owner can create login logs"
  ON public.user_login_logs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR 
    user_id = auth.uid()
  );

-- La politique SELECT existe déjà (créée dans la migration précédente)

-- 5. ACTIVER RLS SUR TOUTES LES TABLES SI PAS ENCORE FAIT
-- ========================================
ALTER TABLE IF EXISTS public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rate_limit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_login_logs ENABLE ROW LEVEL SECURITY;

-- 6. SÉCURISER SECURITY_BLOCKS - Table critique pour la sécurité
-- ========================================
DROP POLICY IF EXISTS "Service role can manage blocks" ON public.security_blocks;

-- Seul le service role peut gérer les blocages
CREATE POLICY "Only service role can insert blocks"
  ON public.security_blocks
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update blocks"
  ON public.security_blocks
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Lecture: service role + admins
CREATE POLICY "Service role and admins can view blocks"
  ON public.security_blocks
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR has_role(auth.uid(), 'admin'::user_role)
  );

-- 7. SÉCURISER OTP_CODES - Codes OTP sensibles
-- ========================================
DROP POLICY IF EXISTS "Users can view own otp codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Service role can manage otp codes" ON public.otp_codes;

-- Lecture: uniquement l'utilisateur concerné ou admin
CREATE POLICY "Users can only view own OTP codes"
  ON public.otp_codes
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role));

-- Insertion: service role uniquement (send-otp edge function)
CREATE POLICY "Only service role can create OTP codes"
  ON public.otp_codes
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Mise à jour: service role uniquement (verify-otp-code edge function)
CREATE POLICY "Only service role can update OTP codes"
  ON public.otp_codes
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Suppression: service role uniquement
CREATE POLICY "Only service role can delete OTP codes"
  ON public.otp_codes
  FOR DELETE
  USING (auth.role() = 'service_role');

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
