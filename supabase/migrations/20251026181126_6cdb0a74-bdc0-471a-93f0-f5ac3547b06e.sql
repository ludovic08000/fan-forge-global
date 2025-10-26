-- Ajouter une colonne pour stocker le Stripe price ID
ALTER TABLE public.creators 
ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Ajouter une colonne pour stocker le Stripe product ID  
ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS stripe_product_id text;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_creators_stripe_price_id ON public.creators(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_creators_stripe_product_id ON public.creators(stripe_product_id);