-- Table pour les notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS pour notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs peuvent voir leurs notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Système peut créer des notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Utilisateurs peuvent marquer comme lu"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Table pour les utilisateurs bannis du chat live
CREATE TABLE public.live_stream_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(live_stream_id, user_id)
);

-- Index pour performances
CREATE INDEX idx_live_stream_bans_stream_id ON public.live_stream_bans(live_stream_id);
CREATE INDEX idx_live_stream_bans_user_id ON public.live_stream_bans(user_id);

-- RLS pour bans
ALTER TABLE public.live_stream_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Créateurs peuvent voir et gérer les bans de leurs lives"
ON public.live_stream_bans FOR ALL
USING (
  live_stream_id IN (
    SELECT id FROM live_streams WHERE creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Utilisateurs peuvent voir s'ils sont bannis"
ON public.live_stream_bans FOR SELECT
USING (user_id = auth.uid());

-- Table pour le mode slow du chat
CREATE TABLE public.live_stream_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id UUID NOT NULL UNIQUE REFERENCES live_streams(id) ON DELETE CASCADE,
  slow_mode_enabled BOOLEAN DEFAULT false,
  slow_mode_interval INTEGER DEFAULT 5,
  subscribers_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour settings
ALTER TABLE public.live_stream_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Créateurs peuvent gérer les settings de leurs lives"
ON public.live_stream_settings FOR ALL
USING (
  live_stream_id IN (
    SELECT id FROM live_streams WHERE creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Tout le monde peut voir les settings"
ON public.live_stream_settings FOR SELECT
USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_live_stream_settings_updated_at
BEFORE UPDATE ON public.live_stream_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Activer realtime pour notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;