-- Ajouter le champ otp_verified à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;

-- Créer un index pour les requêtes de vérification
CREATE INDEX IF NOT EXISTS idx_profiles_otp_verified ON public.profiles(user_id, otp_verified);