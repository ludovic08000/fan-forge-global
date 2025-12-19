-- Réinitialiser les données Stripe Connect pour permettre une nouvelle connexion
-- avec la nouvelle plateforme Stripe

UPDATE creators
SET 
  stripe_account_id = NULL,
  stripe_account_status = NULL,
  stripe_onboarding_completed = false,
  stripe_charges_enabled = false,
  stripe_payouts_enabled = false
WHERE stripe_account_id IS NOT NULL;