
-- 1) Créer une vue sécurisée qui masque l'email
CREATE OR REPLACE VIEW public.user_login_logs_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  username,
  -- Email masqué : "j***@g***.com"
  CASE
    WHEN email IS NULL OR email = '' THEN '***@***.***'
    ELSE
      LEFT(SPLIT_PART(email, '@', 1), 1) || '***@' ||
      LEFT(SPLIT_PART(SPLIT_PART(email, '@', 2), '.', 1), 1) || '***.' ||
      SUBSTRING(SPLIT_PART(email, '@', 2) FROM POSITION('.' IN SPLIT_PART(email, '@', 2)) + 1)
  END AS masked_email,
  ip_address,
  user_agent,
  login_method,
  session_id,
  created_at
FROM public.user_login_logs;

-- 2) Révoquer l'accès direct à la table brute pour anon et authenticated
REVOKE SELECT ON public.user_login_logs FROM anon;
REVOKE SELECT ON public.user_login_logs FROM authenticated;

-- 3) Accorder l'accès à la vue sécurisée uniquement
GRANT SELECT ON public.user_login_logs_safe TO authenticated;
