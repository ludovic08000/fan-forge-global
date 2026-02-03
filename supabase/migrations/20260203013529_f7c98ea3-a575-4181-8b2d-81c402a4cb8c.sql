-- Table pour tracer les transactions de revenus collaboratifs
CREATE TABLE public.collaborative_revenue_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  partnership_id UUID REFERENCES public.creator_partnerships(id) ON DELETE SET NULL,
  primary_creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  partner_creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  primary_amount NUMERIC NOT NULL DEFAULT 0,
  partner_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('subscription', 'tip', 'private_content', 'live')),
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_collab_revenue_primary_creator ON public.collaborative_revenue_transactions(primary_creator_id);
CREATE INDEX idx_collab_revenue_partner_creator ON public.collaborative_revenue_transactions(partner_creator_id);
CREATE INDEX idx_collab_revenue_content ON public.collaborative_revenue_transactions(content_id);
CREATE INDEX idx_collab_revenue_partnership ON public.collaborative_revenue_transactions(partnership_id);
CREATE INDEX idx_collab_revenue_created ON public.collaborative_revenue_transactions(created_at DESC);

-- RLS
ALTER TABLE public.collaborative_revenue_transactions ENABLE ROW LEVEL SECURITY;

-- Les créateurs peuvent voir leurs propres transactions (en tant que primary ou partner)
CREATE POLICY "Creators can view own collaborative transactions"
ON public.collaborative_revenue_transactions
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM creators WHERE id = primary_creator_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM creators WHERE id = partner_creator_id AND user_id = auth.uid())
);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all collaborative transactions"
ON public.collaborative_revenue_transactions
FOR SELECT
USING (is_admin(auth.uid()));

-- Trigger pour updated_at
CREATE TRIGGER update_collab_revenue_updated_at
  BEFORE UPDATE ON public.collaborative_revenue_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();