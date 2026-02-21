
-- Remplacer la policy INSERT trop permissive sur security_access_logs
DROP POLICY IF EXISTS "Service role inserts security logs" ON public.security_access_logs;
CREATE POLICY "Service role inserts security logs"
  ON public.security_access_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Remplacer la policy INSERT trop permissive sur security_alerts
DROP POLICY IF EXISTS "Service role inserts security alerts" ON public.security_alerts;
CREATE POLICY "Service role inserts security alerts"
  ON public.security_alerts
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
