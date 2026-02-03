-- =====================================================
-- SECURITY FIX 1: Ajouter des policies aux tables sans policies
-- =====================================================

-- email_action_logs: Logs de sécurité - lecture seule par admin, insertion par système
CREATE POLICY "Only admins can view email action logs"
ON public.email_action_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert email action logs"
ON public.email_action_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- secure_email_tokens: Tokens sécurisés - seulement via service role
CREATE POLICY "Only admins can view secure email tokens"
ON public.secure_email_tokens FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- SECURITY FIX 2: Corriger les policies trop permissives
-- =====================================================

-- ai_moderation_queue: Remplacer INSERT (true) par une policy plus stricte
DROP POLICY IF EXISTS "System can insert moderation queue items" ON public.ai_moderation_queue;
CREATE POLICY "Authenticated users can submit for moderation"
ON public.ai_moderation_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- referral_subscriptions: Remplacer INSERT (true)
DROP POLICY IF EXISTS "System can insert referral subscriptions" ON public.referral_subscriptions;
CREATE POLICY "Users can create their own referral subscriptions"
ON public.referral_subscriptions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- SECURITY FIX 3: Supprimer la policy dangereuse sur user_roles
-- Les utilisateurs ne doivent PAS pouvoir créer leur propre rôle!
-- =====================================================

DROP POLICY IF EXISTS "Users can create their own role" ON public.user_roles;
-- Note: La création de rôles doit se faire uniquement via Edge Function avec service_role