
-- Révoquer TOUS les privilèges pour anon sur les tables security_*
REVOKE ALL ON public.security_access_logs FROM anon;
REVOKE ALL ON public.security_alerts FROM anon;
REVOKE ALL ON public.security_blocks FROM anon;

-- Restreindre authenticated au minimum nécessaire (les RLS policies font le filtrage fin)
REVOKE ALL ON public.security_access_logs FROM authenticated;
GRANT SELECT, INSERT ON public.security_access_logs TO authenticated;

REVOKE ALL ON public.security_alerts FROM authenticated;
GRANT SELECT ON public.security_alerts TO authenticated;

REVOKE ALL ON public.security_blocks FROM authenticated;
GRANT SELECT ON public.security_blocks TO authenticated;

-- service_role garde tous les accès (utilisé par les Edge Functions)
GRANT ALL ON public.security_access_logs TO service_role;
GRANT ALL ON public.security_alerts TO service_role;
GRANT ALL ON public.security_blocks TO service_role;
