-- Add privacy settings columns to creators table
ALTER TABLE public.creators 
ADD COLUMN IF NOT EXISTS hide_from_search_engines BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_subscriber_count BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_countries TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.creators.hide_from_search_engines IS 'Si true, le profil ne sera pas inclus dans le sitemap et aura noindex';
COMMENT ON COLUMN public.creators.hide_subscriber_count IS 'Si true, le nombre d''abonnés sera masqué sur le profil public';
COMMENT ON COLUMN public.creators.blocked_countries IS 'Liste des codes pays ISO 3166-1 alpha-2 bloqués (ex: FR, US, DE)';