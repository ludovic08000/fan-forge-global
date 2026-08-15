-- Security hardening: keep sensitive creator fields behind scoped SECURITY DEFINER RPCs.
-- The historical public grant from 20260320205627 included
-- platform_commission_rate; the current security audit explicitly classifies
-- it as sensitive, so it is intentionally not re-granted here.

CREATE OR REPLACE FUNCTION public.get_my_creator_full()
RETURNS SETOF public.creators
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.*
  FROM public.creators AS c
  WHERE c.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_creator_full() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_creator_full() TO authenticated;

-- Admin-only projection used by the payment dashboard. Returning JSON keeps
-- private Stripe fields off the creators table grant while preserving the UI.
CREATE OR REPLACE FUNCTION public.get_admin_creator_payment_profiles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'user_id', c.user_id,
        'stage_name', c.stage_name,
        'stripe_account_id', c.stripe_account_id,
        'stripe_account_status', c.stripe_account_status,
        'stripe_charges_enabled', c.stripe_charges_enabled,
        'stripe_payouts_enabled', c.stripe_payouts_enabled,
        'payment_frequency', c.payment_frequency,
        'currency', c.currency,
        'total_subscribers', c.total_subscribers
      ) ORDER BY c.created_at DESC
    )
    FROM public.creators AS c
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_creator_payment_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_creator_payment_profiles() TO authenticated;

-- Admin-only payment requests with the legacy banking fields required by the
-- current admin screen. These fields remain inaccessible through public table SELECT.
CREATE OR REPLACE FUNCTION public.get_admin_payment_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC)
    FROM (
      SELECT
        r.*,
        jsonb_build_object(
          'stage_name', c.stage_name,
          'bank_account_holder', c.bank_account_holder,
          'bank_iban', c.bank_iban,
          'bank_bic', c.bank_bic,
          'bank_country', c.bank_country
        ) AS creators
      FROM public.creator_payment_requests AS r
      JOIN public.creators AS c ON c.id = r.creator_id
    ) AS q
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_payment_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_payment_requests() TO authenticated;

REVOKE SELECT ON public.creators FROM anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  stage_name,
  category,
  categories,
  subscription_price,
  currency,
  is_featured,
  featured_until,
  total_subscribers,
  total_content,
  is_accepting_tips,
  gender,
  orientation,
  content_type,
  created_at,
  updated_at,
  is_paused,
  noshow_count,
  noshow_penalty_level,
  visibility_reduced,
  lives_blocked_until,
  hide_subscriber_count,
  blocked_countries
) ON public.creators TO anon, authenticated;
