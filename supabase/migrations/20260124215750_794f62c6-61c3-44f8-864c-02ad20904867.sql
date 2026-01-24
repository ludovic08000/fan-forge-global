-- Ajouter la colonne terms_accepted pour suivre l'acceptation des CGU
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(20) DEFAULT NULL;

-- Table pour stocker les réservations de lives
CREATE TABLE IF NOT EXISTS public.live_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(live_stream_id, user_id)
);

-- Enable RLS
ALTER TABLE public.live_reservations ENABLE ROW LEVEL SECURITY;

-- Policies for live_reservations
CREATE POLICY "Users can view their own reservations"
ON public.live_reservations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reservations"
ON public.live_reservations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reservations"
ON public.live_reservations
FOR DELETE
USING (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_live_reservations_user_id ON public.live_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_live_reservations_live_stream_id ON public.live_reservations(live_stream_id);
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted ON public.profiles(terms_accepted_at);

-- Commentaires pour la documentation
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Date d''acceptation des CGU';
COMMENT ON COLUMN public.profiles.privacy_accepted_at IS 'Date d''acceptation de la politique de confidentialité';
COMMENT ON COLUMN public.profiles.terms_version IS 'Version des CGU acceptées';
COMMENT ON COLUMN public.profiles.privacy_version IS 'Version de la politique de confidentialité acceptée';