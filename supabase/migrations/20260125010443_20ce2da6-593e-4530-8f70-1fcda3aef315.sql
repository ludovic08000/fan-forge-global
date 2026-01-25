-- Ajouter la colonne cookie_consent à la table profiles pour stocker le consentement RGPD
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cookie_consent JSONB DEFAULT NULL;

-- Commentaire sur la colonne
COMMENT ON COLUMN public.profiles.cookie_consent IS 'Stockage du consentement cookies RGPD (version, timestamp, preferences, expiration)';