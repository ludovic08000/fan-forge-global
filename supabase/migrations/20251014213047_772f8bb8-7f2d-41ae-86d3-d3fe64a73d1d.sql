-- Table pour les paiements d'accès aux lives premium
CREATE TABLE public.live_stream_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_live_stream_payments_subscriber ON public.live_stream_payments(subscriber_id);
CREATE INDEX idx_live_stream_payments_stream ON public.live_stream_payments(live_stream_id);
CREATE INDEX idx_live_stream_payments_status ON public.live_stream_payments(status);

-- Enable RLS
ALTER TABLE public.live_stream_payments ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Utilisateurs peuvent voir leurs paiements de live"
  ON public.live_stream_payments
  FOR SELECT
  USING (subscriber_id = auth.uid());

CREATE POLICY "Créateurs peuvent voir les paiements de leurs lives"
  ON public.live_stream_payments
  FOR SELECT
  USING (
    live_stream_id IN (
      SELECT id FROM public.live_streams
      WHERE creator_id IN (
        SELECT id FROM public.creators WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Système peut créer des paiements"
  ON public.live_stream_payments
  FOR INSERT
  WITH CHECK (subscriber_id = auth.uid());

-- Table pour le rate limiting
CREATE TABLE public.rate_limit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  ip_address TEXT,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour nettoyage et recherche rapide
CREATE INDEX idx_rate_limit_logs_user_endpoint ON public.rate_limit_logs(user_id, endpoint, created_at);
CREATE INDEX idx_rate_limit_logs_ip_endpoint ON public.rate_limit_logs(ip_address, endpoint, created_at);
CREATE INDEX idx_rate_limit_logs_created_at ON public.rate_limit_logs(created_at);

-- Enable RLS
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Politique RLS - seul le système peut écrire
CREATE POLICY "Système peut logger les rate limits"
  ON public.rate_limit_logs
  FOR INSERT
  WITH CHECK (true);

-- Fonction pour vérifier l'accès à un live premium
CREATE OR REPLACE FUNCTION public.has_live_access(_subscriber_id UUID, _live_stream_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Le live est gratuit
    SELECT 1 FROM live_streams 
    WHERE id = _live_stream_id AND is_premium = false
  ) OR EXISTS (
    -- L'utilisateur a un abonnement actif au créateur
    SELECT 1 FROM live_streams ls
    JOIN creators c ON ls.creator_id = c.id
    WHERE ls.id = _live_stream_id
    AND is_subscribed_to_creator(_subscriber_id, c.id)
  ) OR EXISTS (
    -- L'utilisateur a payé pour ce live spécifiquement
    SELECT 1 FROM live_stream_payments
    WHERE live_stream_id = _live_stream_id
    AND subscriber_id = _subscriber_id
    AND status = 'paid'
  )
$$;

-- Fonction de nettoyage des anciens logs (> 1 heure)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_logs
  WHERE created_at < NOW() - INTERVAL '1 hour';
$$;