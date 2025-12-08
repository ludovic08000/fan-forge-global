-- Mettre à jour la fonction pour inclure les paiements d'accès unique aux lives
CREATE OR REPLACE FUNCTION public.calculate_creator_revenue_with_commission(
  creator_uuid uuid, 
  start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(
  subscription_revenue numeric, 
  tips_revenue numeric, 
  live_revenue numeric, 
  private_content_revenue numeric, 
  total_before_commission numeric, 
  commission_amount numeric, 
  total_after_commission numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _subscription_revenue NUMERIC := 0;
  _tips_revenue NUMERIC := 0;
  _live_revenue NUMERIC := 0;
  _live_access_revenue NUMERIC := 0;
  _private_content_revenue NUMERIC := 0;
  _commission_rate NUMERIC;
  _total_before_commission NUMERIC;
  _commission_amount NUMERIC;
  _total_after_commission NUMERIC;
  _start_date TIMESTAMPTZ := start_date;
  _end_date TIMESTAMPTZ := end_date;
BEGIN
  -- Default to current month if no dates provided
  IF _start_date IS NULL THEN
    _start_date := date_trunc('month', NOW());
  END IF;
  IF _end_date IS NULL THEN
    _end_date := NOW();
  END IF;

  -- Commission rate (15% par défaut)
  SELECT platform_commission_rate INTO _commission_rate
  FROM creators
  WHERE id = creator_uuid;

  IF _commission_rate IS NULL THEN
    _commission_rate := 0.15;
  END IF;

  -- Subscription revenue
  SELECT COALESCE(SUM(price), 0) INTO _subscription_revenue
  FROM subscriptions
  WHERE creator_id = creator_uuid
    AND status = 'active'
    AND created_at BETWEEN _start_date AND _end_date;

  -- Tips revenue (pas de commission sur les pourboires)
  SELECT COALESCE(SUM(amount), 0) INTO _tips_revenue
  FROM tips
  WHERE creator_id = creator_uuid
    AND created_at BETWEEN _start_date AND _end_date;

  -- Live revenue (revenus par minute de visionnage)
  SELECT COALESCE(SUM(revenue_amount), 0) INTO _live_revenue
  FROM live_stream_revenue
  WHERE creator_id = creator_uuid
    AND created_at BETWEEN _start_date AND _end_date;

  -- Live access payments (paiements uniques pour accès aux lives) - AVEC COMMISSION
  SELECT COALESCE(SUM(lsp.amount), 0) INTO _live_access_revenue
  FROM live_stream_payments lsp
  JOIN live_streams ls ON ls.id = lsp.live_stream_id
  WHERE ls.creator_id = creator_uuid
    AND lsp.status = 'paid'
    AND lsp.created_at BETWEEN _start_date AND _end_date;

  -- Private content revenue
  SELECT COALESCE(SUM(pcp.amount), 0) INTO _private_content_revenue
  FROM private_content_payments pcp
  JOIN private_messages pm ON pm.id = pcp.message_id
  WHERE pm.creator_id = creator_uuid
    AND pcp.status = 'paid'
    AND pcp.created_at BETWEEN _start_date AND _end_date;

  -- Inclure les paiements d'accès live dans live_revenue
  _live_revenue := _live_revenue + _live_access_revenue;

  _total_before_commission := _subscription_revenue + _tips_revenue + _live_revenue + _private_content_revenue;
  -- Commission sur tout SAUF les pourboires
  _commission_amount := (_subscription_revenue + _live_revenue + _private_content_revenue) * _commission_rate;
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
$function$;