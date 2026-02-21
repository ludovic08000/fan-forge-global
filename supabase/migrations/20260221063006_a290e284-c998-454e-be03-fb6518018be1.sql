-- Security access logs for proxy monitoring
CREATE TABLE IF NOT EXISTS public.security_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  endpoint TEXT NOT NULL,
  resource_path TEXT,
  content_id UUID,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for time-based queries
CREATE INDEX idx_security_access_logs_created_at ON public.security_access_logs (created_at DESC);
CREATE INDEX idx_security_access_logs_user_endpoint ON public.security_access_logs (user_id, endpoint, created_at DESC);

-- Auto-cleanup old logs (keep 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_access_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.security_access_logs WHERE created_at < now() - interval '7 days';
$$;

-- RLS: only admins can read, service_role can insert
ALTER TABLE public.security_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security logs"
  ON public.security_access_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role inserts security logs"
  ON public.security_access_logs FOR INSERT
  WITH CHECK (true);

-- Security alerts table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  user_id UUID,
  ip_address TEXT,
  details JSONB DEFAULT '{}',
  metric_value INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_alerts_created_at ON public.security_alerts (created_at DESC);
CREATE INDEX idx_security_alerts_severity ON public.security_alerts (severity, created_at DESC);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security alerts"
  ON public.security_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update security alerts"
  ON public.security_alerts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role inserts security alerts"
  ON public.security_alerts FOR INSERT
  WITH CHECK (true);