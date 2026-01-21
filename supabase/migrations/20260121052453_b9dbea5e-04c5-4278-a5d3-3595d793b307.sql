-- Ajouter les colonnes pour l'extension de live
ALTER TABLE public.live_streams 
ADD COLUMN IF NOT EXISTS max_duration_minutes integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS extension_count integer DEFAULT 0;

-- Commenter les colonnes
COMMENT ON COLUMN public.live_streams.max_duration_minutes IS 'Durée maximum du live en minutes (20 par défaut, augmentée avec les extensions)';
COMMENT ON COLUMN public.live_streams.extension_count IS 'Nombre d extensions achetées pour ce live';