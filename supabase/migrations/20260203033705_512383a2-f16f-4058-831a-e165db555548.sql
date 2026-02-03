-- Ajouter le suivi des pénalités créateur pour les no-shows
ALTER TABLE private_live_revenue 
ADD COLUMN IF NOT EXISTS creator_penalty DECIMAL(10,2) DEFAULT 0;

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN private_live_revenue.creator_penalty IS 'Frais Stripe à la charge du créateur en cas de no-show (remboursement client)';