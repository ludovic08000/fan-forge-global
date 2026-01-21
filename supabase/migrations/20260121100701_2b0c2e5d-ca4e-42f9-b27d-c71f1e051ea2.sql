-- Fix: Recreate view with security_invoker instead of default security_definer
DROP VIEW IF EXISTS public.public_creators_safe;
CREATE VIEW public.public_creators_safe
WITH (security_invoker = true) AS
SELECT 
  id, 
  user_id, 
  stage_name, 
  category, 
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
  is_paused
  -- EXPLICITLY EXCLUDED: bank_iban, bank_bic, bank_account_holder, bank_country,
  -- tax_id, stripe_account_id, stripe_account_status, stripe_charges_enabled,
  -- stripe_payouts_enabled, stripe_onboarding_completed, total_earnings,
  -- platform_commission_rate, payment_frequency
FROM creators
WHERE is_paused = false OR is_paused IS NULL;

-- Grant access to the safe view
GRANT SELECT ON public.public_creators_safe TO anon, authenticated;