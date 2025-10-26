-- Ajouter les colonnes Stripe Connect aux créateurs
ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'not_connected',
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

-- Index pour rechercher par compte Stripe
CREATE INDEX IF NOT EXISTS idx_creators_stripe_account ON public.creators(stripe_account_id);

COMMENT ON COLUMN public.creators.stripe_account_id IS 'ID du compte Stripe Connect du créateur';
COMMENT ON COLUMN public.creators.stripe_account_status IS 'Statut du compte: not_connected, pending, active, restricted';
COMMENT ON COLUMN public.creators.stripe_onboarding_completed IS 'Si le créateur a complété l onboarding Stripe';
COMMENT ON COLUMN public.creators.stripe_charges_enabled IS 'Si le compte peut recevoir des paiements';
COMMENT ON COLUMN public.creators.stripe_payouts_enabled IS 'Si le compte peut recevoir des virements';