-- Table pour les suspensions d'utilisateurs
CREATE TABLE public.user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  suspended_by UUID NOT NULL,
  reason TEXT NOT NULL,
  leak_id UUID REFERENCES public.content_leaks(id),
  suspended_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lifted_at TIMESTAMP WITH TIME ZONE,
  lifted_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_user_suspensions_user_id ON public.user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_is_active ON public.user_suspensions(is_active);

-- RLS
ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent gérer les suspensions
CREATE POLICY "Admins can manage suspensions"
ON public.user_suspensions
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Fonction pour vérifier si un utilisateur est suspendu
CREATE OR REPLACE FUNCTION public.is_user_suspended(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_suspensions
    WHERE user_id = _user_id
      AND is_active = true
  )
$$;