-- Table pour tracker les revenus par minute de live
CREATE TABLE IF NOT EXISTS public.live_stream_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  minute_number INTEGER NOT NULL,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  revenue_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(live_stream_id, minute_number)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_live_stream_revenue_stream ON public.live_stream_revenue(live_stream_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_revenue_creator ON public.live_stream_revenue(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_revenue_created ON public.live_stream_revenue(created_at);

-- Enable RLS
ALTER TABLE public.live_stream_revenue ENABLE ROW LEVEL SECURITY;

-- Politique : Créateurs peuvent voir leurs revenus
CREATE POLICY "Créateurs peuvent voir leurs revenus de live"
ON public.live_stream_revenue
FOR SELECT
USING (
  creator_id IN (
    SELECT id FROM public.creators WHERE user_id = auth.uid()
  )
);

-- Politique : Système peut créer des entrées de revenus
CREATE POLICY "Système peut créer des revenus de live"
ON public.live_stream_revenue
FOR INSERT
WITH CHECK (true);

-- Fonction pour calculer les revenus par minute
CREATE OR REPLACE FUNCTION public.calculate_live_revenue(
  _live_stream_id UUID,
  _minute_number INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _creator_id UUID;
  _viewer_count INTEGER;
  _revenue_per_viewer NUMERIC := 0.01; -- 1 centime par spectateur par minute
  _currency TEXT;
BEGIN
  -- Récupérer les infos du live
  SELECT creator_id INTO _creator_id
  FROM live_streams
  WHERE id = _live_stream_id;

  IF _creator_id IS NULL THEN
    RETURN;
  END IF;

  -- Compter les spectateurs actifs à cette minute
  SELECT COUNT(DISTINCT user_id) INTO _viewer_count
  FROM live_stream_viewers
  WHERE live_stream_id = _live_stream_id
  AND joined_at <= NOW()
  AND (left_at IS NULL OR left_at > NOW() - INTERVAL '1 minute');

  -- Récupérer la devise du créateur
  SELECT currency INTO _currency
  FROM creators
  WHERE id = _creator_id;

  -- Insérer ou mettre à jour les revenus
  INSERT INTO live_stream_revenue (
    live_stream_id,
    creator_id,
    minute_number,
    viewer_count,
    revenue_amount,
    currency
  )
  VALUES (
    _live_stream_id,
    _creator_id,
    _minute_number,
    _viewer_count,
    _viewer_count * _revenue_per_viewer,
    _currency
  )
  ON CONFLICT (live_stream_id, minute_number)
  DO UPDATE SET
    viewer_count = EXCLUDED.viewer_count,
    revenue_amount = EXCLUDED.revenue_amount;
END;
$$;