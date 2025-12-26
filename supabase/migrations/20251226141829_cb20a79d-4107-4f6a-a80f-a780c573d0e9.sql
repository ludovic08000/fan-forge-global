-- Ajouter une colonne pour la durée de la réduction en mois
ALTER TABLE public.referral_codes
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1;

-- 1 = premier mois seulement
-- 2, 3, 6 = X premiers mois
-- NULL ou 0 = toujours (forever)