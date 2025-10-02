-- Table pour les signalements de contenu
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les logs de connexion
CREATE TABLE IF NOT EXISTS public.user_login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username TEXT,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  login_method TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_content_id ON public.content_reports(content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON public.content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON public.user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_created_at ON public.user_login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_ip_address ON public.user_login_logs(ip_address);

-- Activer RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour content_reports
-- Les utilisateurs peuvent créer des signalements
CREATE POLICY "Utilisateurs peuvent créer des signalements"
  ON public.content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Les utilisateurs peuvent voir leurs propres signalements
CREATE POLICY "Utilisateurs peuvent voir leurs signalements"
  ON public.content_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Les admins peuvent tout voir et modifier
CREATE POLICY "Admins peuvent gérer tous les signalements"
  ON public.content_reports
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Politiques RLS pour user_login_logs
-- Seuls les admins peuvent voir les logs
CREATE POLICY "Admins peuvent voir tous les logs"
  ON public.user_login_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Système peut insérer des logs (via service role)
CREATE POLICY "Système peut créer des logs"
  ON public.user_login_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger pour mettre à jour reviewed_at
CREATE OR REPLACE FUNCTION public.update_report_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('resolved', 'rejected') THEN
    NEW.reviewed_at = now();
    NEW.reviewed_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_report_reviewed_at
  BEFORE UPDATE ON public.content_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_report_reviewed_at();