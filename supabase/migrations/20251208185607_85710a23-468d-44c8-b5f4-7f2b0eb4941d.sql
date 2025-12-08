-- Supprimer puis recréer la fonction avec les bons noms de paramètres
DROP FUNCTION IF EXISTS public.calculate_creator_total_revenue(uuid, timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.calculate_creator_total_revenue(
  creator_uuid uuid, 
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_revenue NUMERIC := 0;
  subscription_revenue NUMERIC := 0;
  tips_revenue NUMERIC := 0;
  live_revenue NUMERIC := 0;
  private_content_revenue NUMERIC := 0;
  _start_date TIMESTAMPTZ;
  _end_date TIMESTAMPTZ;
BEGIN
  -- Si pas de dates, prendre le mois en cours
  IF p_start_date IS NULL THEN
    _start_date := date_trunc('month', NOW());
  ELSE
    _start_date := p_start_date;
  END IF;
  
  IF p_end_date IS NULL THEN
    _end_date := NOW();
  ELSE
    _end_date := p_end_date;
  END IF;

  -- Revenus des abonnements
  SELECT COALESCE(SUM(price), 0) INTO subscription_revenue
  FROM subscriptions
  WHERE creator_id = creator_uuid
    AND status = 'active'
    AND created_at BETWEEN _start_date AND _end_date;

  -- Revenus des pourboires
  SELECT COALESCE(SUM(amount), 0) INTO tips_revenue
  FROM tips
  WHERE creator_id = creator_uuid
    AND created_at BETWEEN _start_date AND _end_date;

  -- Revenus des lives
  SELECT COALESCE(SUM(revenue_amount), 0) INTO live_revenue
  FROM live_stream_revenue
  WHERE creator_id = creator_uuid
    AND created_at BETWEEN _start_date AND _end_date;

  -- Revenus du contenu privé payant
  SELECT COALESCE(SUM(pcp.amount), 0) INTO private_content_revenue
  FROM private_content_payments pcp
  JOIN private_messages pm ON pm.id = pcp.message_id
  WHERE pm.creator_id = creator_uuid
    AND pcp.status = 'paid'
    AND pcp.created_at BETWEEN _start_date AND _end_date;

  total_revenue := subscription_revenue + tips_revenue + live_revenue + private_content_revenue;
  
  RETURN total_revenue;
END;
$$;