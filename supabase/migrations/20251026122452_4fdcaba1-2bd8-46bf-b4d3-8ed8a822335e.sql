-- Ajouter le champ de fréquence de paiement aux créateurs
ALTER TABLE public.creators 
ADD COLUMN IF NOT EXISTS payment_frequency text DEFAULT 'monthly' CHECK (payment_frequency IN ('weekly', 'monthly', 'quarterly'));

-- Ajouter un commentaire pour expliquer
COMMENT ON COLUMN public.creators.payment_frequency IS 'Fréquence de paiement préférée du créateur: weekly, monthly, quarterly';

-- Créer une fonction pour calculer les revenus totaux d'un créateur
CREATE OR REPLACE FUNCTION public.calculate_creator_total_revenue(creator_uuid UUID, start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_revenue NUMERIC := 0;
  subscription_revenue NUMERIC := 0;
  tips_revenue NUMERIC := 0;
  live_revenue NUMERIC := 0;
  private_content_revenue NUMERIC := 0;
BEGIN
  -- Si pas de dates, prendre le mois en cours
  IF start_date IS NULL THEN
    start_date := date_trunc('month', NOW());
  END IF;
  
  IF end_date IS NULL THEN
    end_date := NOW();
  END IF;

  -- Revenus des abonnements
  SELECT COALESCE(SUM(price), 0) INTO subscription_revenue
  FROM subscriptions
  WHERE creator_id = creator_uuid
    AND status = 'active'
    AND created_at BETWEEN start_date AND end_date;

  -- Revenus des pourboires
  SELECT COALESCE(SUM(amount), 0) INTO tips_revenue
  FROM tips
  WHERE creator_id = creator_uuid
    AND created_at BETWEEN start_date AND end_date;

  -- Revenus des lives
  SELECT COALESCE(SUM(revenue_amount), 0) INTO live_revenue
  FROM live_stream_revenue
  WHERE creator_id = creator_uuid
    AND created_at BETWEEN start_date AND end_date;

  -- Revenus du contenu privé payant
  SELECT COALESCE(SUM(pcp.amount), 0) INTO private_content_revenue
  FROM private_content_payments pcp
  JOIN private_messages pm ON pm.id = pcp.message_id
  WHERE pm.creator_id = creator_uuid
    AND pcp.status = 'paid'
    AND pcp.created_at BETWEEN start_date AND end_date;

  total_revenue := subscription_revenue + tips_revenue + live_revenue + private_content_revenue;
  
  RETURN total_revenue;
END;
$$;