-- Ajouter les champs d'abonnement aux créateurs

ALTER TABLE public.creators 
ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'Gratuit',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_creators_subscription_active ON public.creators(subscription_active);
CREATE INDEX IF NOT EXISTS idx_creators_plan_type ON public.creators(plan_type);