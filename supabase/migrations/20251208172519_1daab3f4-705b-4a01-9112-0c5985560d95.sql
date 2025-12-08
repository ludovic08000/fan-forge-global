-- Table pour enregistrer les fuites de contenu détectées
CREATE TABLE public.content_leaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  watermark_pattern TEXT NOT NULL,
  short_id TEXT NOT NULL,
  leak_timestamp TIMESTAMPTZ,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detected_by UUID NOT NULL,
  source_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  action_taken TEXT,
  action_taken_at TIMESTAMPTZ,
  action_taken_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche rapide par utilisateur (récidivistes)
CREATE INDEX idx_content_leaks_user_id ON public.content_leaks(user_id);
CREATE INDEX idx_content_leaks_short_id ON public.content_leaks(short_id);
CREATE INDEX idx_content_leaks_status ON public.content_leaks(status);

-- Enable RLS
ALTER TABLE public.content_leaks ENABLE ROW LEVEL SECURITY;

-- Politique: Seuls les admins peuvent gérer les fuites
CREATE POLICY "Admins can manage all leaks"
ON public.content_leaks
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger pour updated_at
CREATE TRIGGER update_content_leaks_updated_at
BEFORE UPDATE ON public.content_leaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Vue pour compter les récidivistes
CREATE OR REPLACE FUNCTION public.get_recidivist_users(min_leaks INTEGER DEFAULT 2)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  username TEXT,
  leak_count BIGINT,
  first_leak TIMESTAMPTZ,
  last_leak TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.user_id,
    p.display_name AS user_email,
    p.username,
    COUNT(*)::BIGINT AS leak_count,
    MIN(cl.detected_at) AS first_leak,
    MAX(cl.detected_at) AS last_leak
  FROM content_leaks cl
  LEFT JOIN profiles p ON p.user_id = cl.user_id
  GROUP BY cl.user_id, p.display_name, p.username
  HAVING COUNT(*) >= min_leaks
  ORDER BY leak_count DESC;
END;
$$;