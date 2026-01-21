-- FIX: Handle the policy properly - drop if exists and recreate view
-- The functions were already updated in the previous migration

-- Drop and recreate the policy to fix the data exposure
DROP POLICY IF EXISTS "Owners and admins can view full creator data" ON public.creators;

CREATE POLICY "Owners and admins can view full creator data"
  ON public.creators
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Recreate the public_creators_safe view without sensitive columns
DROP VIEW IF EXISTS public.public_creators_safe;
CREATE VIEW public.public_creators_safe AS
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