CREATE OR REPLACE FUNCTION public.get_creator_revenue_timeseries(
  creator_uuid uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_bucket text DEFAULT 'day'
)
RETURNS TABLE(
  bucket_start timestamptz,
  subscription_revenue numeric,
  tips_revenue numeric,
  live_revenue numeric,
  private_content_revenue numeric,
  total_before_commission numeric,
  commission_amount numeric,
  total_after_commission numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rate numeric;
  _step interval;
  _bucket text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.id = creator_uuid AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _bucket := CASE lower(coalesce(p_bucket, 'day'))
    WHEN 'hour' THEN 'hour'
    WHEN 'month' THEN 'month'
    ELSE 'day'
  END;

  _step := CASE _bucket
    WHEN 'hour' THEN interval '1 hour'
    WHEN 'month' THEN interval '1 month'
    ELSE interval '1 day'
  END;

  SELECT coalesce(c.platform_commission_rate, 15) / 100.0 INTO _rate
  FROM public.creators c WHERE c.id = creator_uuid;
  IF _rate IS NULL THEN _rate := 0.15; END IF;

  RETURN QUERY
  WITH series AS (
    SELECT generate_series(date_trunc(_bucket, p_start), date_trunc(_bucket, p_end), _step) AS b
  ),
  subs AS (
    SELECT date_trunc(_bucket, s.created_at) AS b, coalesce(sum(s.price), 0) AS amt
    FROM public.subscriptions s
    WHERE s.creator_id = creator_uuid
      AND s.status = 'active'
      AND s.created_at BETWEEN p_start AND p_end
    GROUP BY 1
  ),
  tp AS (
    SELECT date_trunc(_bucket, t.created_at) AS b, coalesce(sum(t.amount), 0) AS amt
    FROM public.tips t
    WHERE t.creator_id = creator_uuid
      AND t.stripe_payment_intent_id IS NOT NULL
      AND t.created_at BETWEEN p_start AND p_end
    GROUP BY 1
  ),
  lv AS (
    SELECT b, coalesce(sum(amt), 0) AS amt FROM (
      SELECT date_trunc(_bucket, r.created_at) AS b, sum(r.revenue_amount) AS amt
      FROM public.live_stream_revenue r
      WHERE r.creator_id = creator_uuid
        AND r.created_at BETWEEN p_start AND p_end
      GROUP BY 1
      UNION ALL
      SELECT date_trunc(_bucket, lsp.created_at) AS b, sum(lsp.amount) AS amt
      FROM public.live_stream_payments lsp
      JOIN public.live_streams ls ON ls.id = lsp.live_stream_id
      WHERE ls.creator_id = creator_uuid
        AND lsp.status = 'paid'
        AND lsp.created_at BETWEEN p_start AND p_end
      GROUP BY 1
    ) u
    GROUP BY b
  ),
  pc AS (
    SELECT date_trunc(_bucket, pcp.created_at) AS b, coalesce(sum(pcp.amount), 0) AS amt
    FROM public.private_content_payments pcp
    JOIN public.private_messages pm ON pm.id = pcp.message_id
    WHERE pm.creator_id = creator_uuid
      AND pcp.status = 'paid'
      AND pcp.created_at BETWEEN p_start AND p_end
    GROUP BY 1
  )
  SELECT
    s.b AS bucket_start,
    coalesce(subs.amt, 0)::numeric AS subscription_revenue,
    coalesce(tp.amt, 0)::numeric AS tips_revenue,
    coalesce(lv.amt, 0)::numeric AS live_revenue,
    coalesce(pc.amt, 0)::numeric AS private_content_revenue,
    (coalesce(subs.amt,0) + coalesce(tp.amt,0) + coalesce(lv.amt,0) + coalesce(pc.amt,0))::numeric AS total_before_commission,
    ((coalesce(subs.amt,0) + coalesce(lv.amt,0) + coalesce(pc.amt,0)) * _rate)::numeric AS commission_amount,
    ((coalesce(subs.amt,0) + coalesce(tp.amt,0) + coalesce(lv.amt,0) + coalesce(pc.amt,0))
      - ((coalesce(subs.amt,0) + coalesce(lv.amt,0) + coalesce(pc.amt,0)) * _rate))::numeric AS total_after_commission
  FROM series s
  LEFT JOIN subs ON subs.b = s.b
  LEFT JOIN tp ON tp.b = s.b
  LEFT JOIN lv ON lv.b = s.b
  LEFT JOIN pc ON pc.b = s.b
  ORDER BY s.b;
END;
$$;

REVOKE ALL ON FUNCTION public.get_creator_revenue_timeseries(uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_creator_revenue_timeseries(uuid, timestamptz, timestamptz, text) TO authenticated;