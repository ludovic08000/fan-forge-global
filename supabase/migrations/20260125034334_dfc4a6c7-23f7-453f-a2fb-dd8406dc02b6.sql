-- Ajout des colonnes réseaux sociaux à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Commentaires pour documentation
COMMENT ON COLUMN public.profiles.instagram_url IS 'Lien vers le profil Instagram du créateur';
COMMENT ON COLUMN public.profiles.twitter_url IS 'Lien vers le profil Twitter/X du créateur';
COMMENT ON COLUMN public.profiles.tiktok_url IS 'Lien vers le profil TikTok du créateur';
COMMENT ON COLUMN public.profiles.youtube_url IS 'Lien vers la chaîne YouTube du créateur';