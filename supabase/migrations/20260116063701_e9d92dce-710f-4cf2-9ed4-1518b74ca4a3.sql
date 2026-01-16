-- Ajouter les colonnes nécessaires pour l'enregistrement des lives
ALTER TABLE public.live_streams 
ADD COLUMN IF NOT EXISTS egress_id TEXT,
ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recording_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recording_error TEXT;

-- Index pour trouver rapidement les streams par egress_id
CREATE INDEX IF NOT EXISTS idx_live_streams_egress_id ON public.live_streams(egress_id) WHERE egress_id IS NOT NULL;

-- Commentaires pour la documentation
COMMENT ON COLUMN public.live_streams.egress_id IS 'ID de l''enregistrement LiveKit Egress en cours';
COMMENT ON COLUMN public.live_streams.recording_started_at IS 'Date/heure de début de l''enregistrement';
COMMENT ON COLUMN public.live_streams.recording_completed_at IS 'Date/heure de fin de l''enregistrement';
COMMENT ON COLUMN public.live_streams.recording_error IS 'Message d''erreur si l''enregistrement a échoué';