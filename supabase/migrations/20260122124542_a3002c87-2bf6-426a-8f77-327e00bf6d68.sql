-- Table pour logger les actions email (avec hash pour privacy)
CREATE TABLE IF NOT EXISTS public.email_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  action TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour rate limiting efficace
CREATE INDEX IF NOT EXISTS idx_email_action_logs_email_hash_action_created 
ON public.email_action_logs(email_hash, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_action_logs_ip_action_created 
ON public.email_action_logs(ip_address, action, created_at DESC);

-- Table pour les tokens sécurisés
CREATE TABLE IF NOT EXISTS public.secure_email_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  action TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide de tokens
CREATE INDEX IF NOT EXISTS idx_secure_email_tokens_token_hash 
ON public.secure_email_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_secure_email_tokens_expires 
ON public.secure_email_tokens(expires_at);

-- Activer RLS
ALTER TABLE public.email_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_email_tokens ENABLE ROW LEVEL SECURITY;

-- Pas de policies pour les utilisateurs - ces tables sont gérées uniquement par les edge functions
-- avec le service role key

-- Fonction de nettoyage automatique des anciens logs (> 7 jours)
CREATE OR REPLACE FUNCTION public.cleanup_old_email_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_action_logs 
  WHERE created_at < now() - interval '7 days';
  
  DELETE FROM public.secure_email_tokens 
  WHERE expires_at < now() - interval '1 day';
END;
$$;