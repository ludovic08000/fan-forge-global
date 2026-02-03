-- Table pour stocker les replays des lives privés vendables
CREATE TABLE public.private_live_replays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  private_live_request_id UUID NOT NULL REFERENCES public.private_live_requests(id) ON DELETE CASCADE,
  live_stream_id UUID REFERENCES public.live_streams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL, -- Chemin R2, pas URL publique
  thumbnail_url TEXT,
  duration INTEGER, -- durée en secondes
  file_size BIGINT,
  original_price NUMERIC(10, 2) NOT NULL, -- Prix original du live privé
  replay_price NUMERIC(10, 2) NOT NULL, -- Prix pour acheter le replay (peut être différent)
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_available BOOLEAN NOT NULL DEFAULT true, -- Le créateur peut désactiver
  view_count INTEGER NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(private_live_request_id) -- Un seul replay par live privé
);

-- Table pour tracker les achats de replays
CREATE TABLE public.private_live_replay_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  replay_id UUID NOT NULL REFERENCES public.private_live_replays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, refunded
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(replay_id, user_id) -- Un utilisateur ne peut acheter qu'une fois
);

-- Enable RLS
ALTER TABLE public.private_live_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_live_replay_purchases ENABLE ROW LEVEL SECURITY;

-- Policies pour private_live_replays
-- Tout le monde peut voir les replays disponibles
CREATE POLICY "Public can view available replays"
ON public.private_live_replays
FOR SELECT
USING (is_available = true);

-- Le créateur peut voir tous ses replays
CREATE POLICY "Creators can view their own replays"
ON public.private_live_replays
FOR SELECT
USING (
  creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
);

-- Le créateur peut modifier ses replays
CREATE POLICY "Creators can update their replays"
ON public.private_live_replays
FOR UPDATE
USING (
  creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
)
WITH CHECK (
  creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
);

-- Policies pour private_live_replay_purchases
-- L'utilisateur peut voir ses propres achats
CREATE POLICY "Users can view their purchases"
ON public.private_live_replay_purchases
FOR SELECT
USING (user_id = auth.uid());

-- Le créateur peut voir les achats de ses replays
CREATE POLICY "Creators can view purchases of their replays"
ON public.private_live_replay_purchases
FOR SELECT
USING (
  replay_id IN (
    SELECT id FROM private_live_replays 
    WHERE creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
  )
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_private_live_replays_updated_at
BEFORE UPDATE ON public.private_live_replays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour les performances
CREATE INDEX idx_private_live_replays_creator ON public.private_live_replays(creator_id);
CREATE INDEX idx_private_live_replays_available ON public.private_live_replays(is_available) WHERE is_available = true;
CREATE INDEX idx_private_live_replay_purchases_user ON public.private_live_replay_purchases(user_id);
CREATE INDEX idx_private_live_replay_purchases_status ON public.private_live_replay_purchases(status);