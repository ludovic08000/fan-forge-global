-- Activer REPLICA IDENTITY pour le temps réel sur les tables admin
ALTER TABLE public.content_reports REPLICA IDENTITY FULL;
ALTER TABLE public.user_login_logs REPLICA IDENTITY FULL;
ALTER TABLE public.identity_verifications REPLICA IDENTITY FULL;
ALTER TABLE public.creator_payment_requests REPLICA IDENTITY FULL;
ALTER TABLE public.user_suspensions REPLICA IDENTITY FULL;

-- Ajouter les tables à la publication realtime si elles n'y sont pas déjà
DO $$
BEGIN
  -- content_reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'content_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_reports;
  END IF;

  -- user_login_logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_login_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_login_logs;
  END IF;

  -- identity_verifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'identity_verifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.identity_verifications;
  END IF;

  -- creator_payment_requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'creator_payment_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_payment_requests;
  END IF;

  -- user_suspensions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_suspensions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_suspensions;
  END IF;
END $$;

-- Créer une table pour les logs d'accès admin (audit trail)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- RLS pour admin_audit_logs (seuls les admins peuvent lire)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (
  auth.uid() = admin_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Fonction pour logger les actions admin automatiquement
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    auth.uid(),
    p_action,
    p_target_type,
    p_target_id,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- RLS renforcée pour les tables sensibles admin

-- Seuls les admins peuvent voir tous les content_reports
DROP POLICY IF EXISTS "Admins can view all reports" ON public.content_reports;
CREATE POLICY "Admins can view all reports"
ON public.content_reports
FOR SELECT
USING (
  reporter_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Seuls les admins peuvent mettre à jour les reports
DROP POLICY IF EXISTS "Admins can update reports" ON public.content_reports;
CREATE POLICY "Admins can update reports"
ON public.content_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Seuls les admins peuvent voir les login logs
DROP POLICY IF EXISTS "Admins can view login logs" ON public.user_login_logs;
CREATE POLICY "Admins can view login logs"
ON public.user_login_logs
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Seuls les admins peuvent voir toutes les verifications
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.identity_verifications;
CREATE POLICY "Admins can view all verifications"
ON public.identity_verifications
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Seuls les admins peuvent mettre à jour les verifications
DROP POLICY IF EXISTS "Admins can update verifications" ON public.identity_verifications;
CREATE POLICY "Admins can update verifications"
ON public.identity_verifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);