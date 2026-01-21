-- Table pour tracker les sessions Stripe déjà traitées (protection anti-replay)
CREATE TABLE IF NOT EXISTS public.processed_stripe_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  session_type text NOT NULL DEFAULT 'unknown',
  creator_id uuid,
  user_id uuid,
  amount numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index sur session_id pour lookup rapide
CREATE INDEX IF NOT EXISTS idx_processed_stripe_sessions_session_id 
  ON public.processed_stripe_sessions(session_id);

-- Index sur session_type pour analytics
CREATE INDEX IF NOT EXISTS idx_processed_stripe_sessions_type 
  ON public.processed_stripe_sessions(session_type);

-- Enable RLS
ALTER TABLE public.processed_stripe_sessions ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent voir les sessions traitées
CREATE POLICY "Admins can view processed sessions"
  ON public.processed_stripe_sessions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Pas d'INSERT/UPDATE/DELETE depuis le client - uniquement service role
-- Les politiques restrictives empêchent tout accès client

-- Commentaire explicatif
COMMENT ON TABLE public.processed_stripe_sessions IS 
  'Tracks processed Stripe sessions to prevent replay attacks on payment endpoints';