-- Table pour les live streams
CREATE TABLE IF NOT EXISTS public.live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_premium BOOLEAN DEFAULT false,
  price NUMERIC(10, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  viewer_count INTEGER DEFAULT 0,
  peak_viewer_count INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  recording_url TEXT,
  stream_key TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les messages du chat en direct
CREATE TABLE IF NOT EXISTS public.live_stream_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les spectateurs du live
CREATE TABLE IF NOT EXISTS public.live_stream_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(live_stream_id, user_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_live_streams_creator_id ON public.live_streams(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON public.live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_stream_messages_stream_id ON public.live_stream_messages(live_stream_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_viewers_stream_id ON public.live_stream_viewers(live_stream_id);

-- Activer RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_viewers ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour live_streams
CREATE POLICY "Tout le monde peut voir les lives publics"
  ON public.live_streams
  FOR SELECT
  USING (is_premium = false OR status = 'live');

CREATE POLICY "Abonnés peuvent voir les lives premium"
  ON public.live_streams
  FOR SELECT
  USING (
    is_premium = false OR 
    is_subscribed_to_creator(auth.uid(), creator_id)
  );

CREATE POLICY "Créateurs peuvent gérer leurs lives"
  ON public.live_streams
  FOR ALL
  USING (creator_id IN (
    SELECT id FROM public.creators WHERE user_id = auth.uid()
  ));

-- Politiques RLS pour live_stream_messages
CREATE POLICY "Utilisateurs peuvent voir les messages des lives qu'ils regardent"
  ON public.live_stream_messages
  FOR SELECT
  USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent envoyer des messages"
  ON public.live_stream_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour live_stream_viewers
CREATE POLICY "Créateurs peuvent voir leurs spectateurs"
  ON public.live_stream_viewers
  FOR SELECT
  USING (
    live_stream_id IN (
      SELECT id FROM public.live_streams 
      WHERE creator_id IN (
        SELECT id FROM public.creators WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Système peut gérer les spectateurs"
  ON public.live_stream_viewers
  FOR ALL
  USING (true);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_live_streams_updated_at
  BEFORE UPDATE ON public.live_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour générer une clé de stream unique
CREATE OR REPLACE FUNCTION public.generate_stream_key()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Activer Realtime pour le chat et les spectateurs
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_viewers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;