-- Changer le défaut de is_premium à true (abonnés seulement par défaut)
ALTER TABLE public.live_streams 
ALTER COLUMN is_premium SET DEFAULT true;

-- Ajouter un commentaire pour clarifier le sens
COMMENT ON COLUMN public.live_streams.is_premium IS 'Si true, seuls les abonnés peuvent voir le live. Si false, le live est gratuit pour tous.';