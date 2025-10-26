-- Fonction pour calculer les revenus avec détail de commission
CREATE OR REPLACE FUNCTION public.calculate_creator_revenue_with_commission(
  creator_uuid UUID,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
  subscription_revenue NUMERIC,
  tips_revenue NUMERIC,
  live_revenue NUMERIC,
  private_content_revenue NUMERIC,
  total_before_commission NUMERIC,
  commission_amount NUMERIC,
  total_after_commission NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _subscription_revenue NUMERIC := 0;
  _tips_revenue NUMERIC := 0;
  _live_revenue NUMERIC := 0;
  _private_content_revenue NUMERIC := 0;
  _commission_rate NUMERIC;
  _total_before_commission NUMERIC;
  _commission_amount NUMERIC;
  _total_after_commission NUMERIC;
BEGIN
  -- Si pas de dates, prendre le mois en cours
  IF start_date IS NULL THEN
    start_date := date_trunc('month', NOW());
  END IF;
  
  IF end_date IS NULL THEN
    end_date := NOW();
  END IF;

  -- Récupérer le taux de commission du créateur
  SELECT platform_commission_rate INTO _commission_rate
  FROM creators
  WHERE id = creator_uuid;

  -- Par défaut 15% si pas défini
  IF _commission_rate IS NULL THEN
    _commission_rate := 0.15;
  END IF;

  -- Revenus des abonnements (avec commission)
  SELECT COALESCE(SUM(price), 0) INTO _subscription_revenue
  FROM subscriptions
  WHERE creator_id = creator_uuid
    AND status = 'active'
    AND created_at BETWEEN start_date AND end_date;

  -- Revenus des pourboires (SANS commission - 100% pour le créateur)
  SELECT COALESCE(SUM(amount), 0) INTO _tips_revenue
  FROM tips
  WHERE creator_id = creator_uuid
    AND created_at BETWEEN start_date AND end_date;

  -- Revenus des lives (avec commission)
  SELECT COALESCE(SUM(revenue_amount), 0) INTO _live_revenue
  FROM live_stream_revenue
  WHERE creator_id = creator_uuid
    AND created_at BETWEEN start_date AND end_date;

  -- Revenus du contenu privé payant (avec commission)
  SELECT COALESCE(SUM(pcp.amount), 0) INTO _private_content_revenue
  FROM private_content_payments pcp
  JOIN private_messages pm ON pm.id = pcp.message_id
  WHERE pm.creator_id = creator_uuid
    AND pcp.status = 'paid'
    AND pcp.created_at BETWEEN start_date AND end_date;

  -- Calcul total avant commission
  _total_before_commission := _subscription_revenue + _tips_revenue + _live_revenue + _private_content_revenue;
  
  -- Commission uniquement sur les revenus hors pourboires
  _commission_amount := (_subscription_revenue + _live_revenue + _private_content_revenue) * _commission_rate;
  
  -- Total après commission (tips gardés à 100%)
  _total_after_commission := _total_before_commission - _commission_amount;
  
  RETURN QUERY SELECT 
    _subscription_revenue,
    _tips_revenue,
    _live_revenue,
    _private_content_revenue,
    _total_before_commission,
    _commission_amount,
    _total_after_commission;
END;
$$;

-- Table pour tracker l'historique des commissions
CREATE TABLE IF NOT EXISTS public.platform_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  payment_request_id UUID REFERENCES public.creator_payment_requests(id) ON DELETE SET NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  subscription_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  tips_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  live_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  private_content_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(4,3) NOT NULL DEFAULT 0.15,
  commission_amount NUMERIC(10,2) NOT NULL,
  creator_payout NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche
CREATE INDEX IF NOT EXISTS idx_platform_commissions_creator ON public.platform_commissions(creator_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_period ON public.platform_commissions(period_start, period_end);

-- RLS policies
ALTER TABLE public.platform_commissions ENABLE ROW LEVEL SECURITY;

-- Les créateurs peuvent voir leurs propres commissions
CREATE POLICY "Creators can view own commissions"
  ON public.platform_commissions
  FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all commissions"
  ON public.platform_commissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );