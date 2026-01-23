-- Table pour les partenariats entre créateurs
CREATE TABLE public.creator_partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  revenue_share_requester NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (revenue_share_requester >= 0 AND revenue_share_requester <= 100),
  revenue_share_partner NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (revenue_share_partner >= 0 AND revenue_share_partner <= 100),
  message TEXT,
  collaboration_type TEXT[] DEFAULT ARRAY['content']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT partnership_unique UNIQUE (requester_id, partner_id),
  CONSTRAINT partnership_not_self CHECK (requester_id != partner_id),
  CONSTRAINT revenue_share_total CHECK (revenue_share_requester + revenue_share_partner = 100)
);

-- Table pour les contenus collaboratifs
CREATE TABLE public.collaborative_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  partnership_id UUID NOT NULL REFERENCES public.creator_partnerships(id) ON DELETE CASCADE,
  primary_creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_content_partnership UNIQUE (content_id)
);

-- Table pour le suivi des revenus partagés
CREATE TABLE public.partnership_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.creator_partnerships(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  requester_share NUMERIC(10,2) NOT NULL DEFAULT 0,
  partner_share NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('subscription', 'tip', 'private_content', 'live')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_revenue ENABLE ROW LEVEL SECURITY;

-- Policies pour creator_partnerships
CREATE POLICY "Creators can view their partnerships"
  ON public.creator_partnerships
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM creators WHERE id = requester_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM creators WHERE id = partner_id AND user_id = auth.uid())
  );

CREATE POLICY "Creators can create partnership requests"
  ON public.creator_partnerships
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM creators WHERE id = requester_id AND user_id = auth.uid() AND is_paused = false)
  );

CREATE POLICY "Creators can update their partnerships"
  ON public.creator_partnerships
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM creators WHERE id = requester_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM creators WHERE id = partner_id AND user_id = auth.uid())
  );

CREATE POLICY "Requester can delete pending partnerships"
  ON public.creator_partnerships
  FOR DELETE
  USING (
    status = 'pending'
    AND EXISTS (SELECT 1 FROM creators WHERE id = requester_id AND user_id = auth.uid())
  );

-- Policies pour collaborative_content
CREATE POLICY "Partners can view collaborative content"
  ON public.collaborative_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creator_partnerships cp
      WHERE cp.id = partnership_id
      AND cp.status = 'accepted'
      AND (
        EXISTS (SELECT 1 FROM creators WHERE id = cp.requester_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM creators WHERE id = cp.partner_id AND user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Primary creator can manage collaborative content"
  ON public.collaborative_content
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM creators WHERE id = primary_creator_id AND user_id = auth.uid())
  );

-- Policies pour partnership_revenue
CREATE POLICY "Partners can view their revenue"
  ON public.partnership_revenue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creator_partnerships cp
      WHERE cp.id = partnership_id
      AND (
        EXISTS (SELECT 1 FROM creators WHERE id = cp.requester_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM creators WHERE id = cp.partner_id AND user_id = auth.uid())
      )
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_creator_partnerships_updated_at
  BEFORE UPDATE ON public.creator_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour les performances
CREATE INDEX idx_partnerships_requester ON public.creator_partnerships(requester_id);
CREATE INDEX idx_partnerships_partner ON public.creator_partnerships(partner_id);
CREATE INDEX idx_partnerships_status ON public.creator_partnerships(status);
CREATE INDEX idx_collaborative_content_partnership ON public.collaborative_content(partnership_id);
CREATE INDEX idx_partnership_revenue_partnership ON public.partnership_revenue(partnership_id);