-- =================================================================
-- FAILLE 1: Table creators expose données bancaires (bank_iban, tax_id, etc.)
-- Supprimer la policy SELECT publique trop permissive
-- Les pages publiques utilisent les vues SECURITY DEFINER
-- =================================================================

DROP POLICY IF EXISTS "Anyone can view active creators public info" ON public.creators;

-- Seuls propriétaire et admins peuvent SELECT directement sur la table
CREATE POLICY "Only owners and admins can SELECT creators"
ON public.creators
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
);

-- =================================================================
-- FAILLE 2: Table profiles expose phone, birthdate, otp_verified
-- Supprimer la policy publique anon sur profiles
-- =================================================================

DROP POLICY IF EXISTS "Anyone can view creator profiles public info" ON public.profiles;

-- =================================================================
-- FAILLE 3: OTP codes lisibles par l'utilisateur (bypass OTP!)
-- =================================================================

DROP POLICY IF EXISTS "Users can only view own OTP codes" ON public.otp_codes;

CREATE POLICY "Only service role can read OTP codes"
ON public.otp_codes
FOR SELECT
USING (auth.role() = 'service_role');

-- =================================================================
-- FAILLE 4: login_attempts INSERT trop permissif
-- =================================================================

DROP POLICY IF EXISTS "Authenticated users can log attempts" ON public.login_attempts;

CREATE POLICY "Only service role can insert login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- =================================================================
-- FAILLE 5: JWT pattern fragile sur private_live_requests
-- =================================================================

DROP POLICY IF EXISTS "Service role full access" ON public.private_live_requests;

CREATE POLICY "Service role full access"
ON public.private_live_requests
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');