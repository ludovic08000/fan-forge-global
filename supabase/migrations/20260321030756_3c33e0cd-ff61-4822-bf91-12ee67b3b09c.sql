CREATE OR REPLACE FUNCTION public.get_my_creator_dashboard_profile()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  stage_name text,
  total_subscribers integer,
  total_content integer,
  featured_until timestamp with time zone,
  stripe_account_status text,
  stripe_charges_enabled boolean,
  stripe_payouts_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.user_id,
    c.stage_name,
    c.total_subscribers,
    c.total_content,
    c.featured_until,
    c.stripe_account_status,
    c.stripe_charges_enabled,
    c.stripe_payouts_enabled
  FROM public.creators c
  WHERE c.user_id = auth.uid()
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_my_creator_dashboard_profile() TO authenticated;