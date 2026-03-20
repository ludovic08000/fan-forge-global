-- Révoquer les colonnes financières sensibles de authenticated
-- Seul service_role (edge functions) peut les lire
-- Le frontend utilise get_creator_financial_data() (SECURITY DEFINER)

REVOKE SELECT (
  total_earnings, bank_account_holder, bank_iban, bank_bic, bank_country,
  tax_id, stripe_account_id, stripe_account_status,
  stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled,
  stripe_price_id, stripe_product_id
) ON public.creators FROM authenticated;

-- Révoquer phone de profiles (birthdate reste pour vérification âge)
REVOKE SELECT (phone) ON public.profiles FROM authenticated;