-- Accorder les colonnes sensibles à authenticated (pas anon)
-- RLS "owner-only" policies filtreront les lignes

-- Creators: colonnes financières pour le propriétaire
GRANT SELECT (
  total_earnings, bank_account_holder, bank_iban, bank_bic, bank_country,
  tax_id, payment_frequency, stripe_account_id, stripe_account_status,
  stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled,
  stripe_price_id, stripe_product_id, paused_at, hide_from_search_engines,
  hide_subscriber_count, blocked_countries, preferred_language
) ON public.creators TO authenticated;

-- Profiles: colonnes privées pour le propriétaire
GRANT SELECT (
  birthdate, phone, gender, orientation, otp_verified,
  terms_accepted_at, privacy_accepted_at, terms_version, privacy_version,
  cookie_consent, updated_at
) ON public.profiles TO authenticated;