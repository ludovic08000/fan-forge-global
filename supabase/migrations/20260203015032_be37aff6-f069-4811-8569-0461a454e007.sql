-- Table pour les demandes de lives privés
CREATE TABLE public.private_live_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_date TIMESTAMP WITH TIME ZONE NOT NULL,
  proposed_duration INTEGER DEFAULT 30, -- durée en minutes
  message TEXT, -- message de l'utilisateur au créateur
  price NUMERIC(10,2), -- prix fixé par le créateur
  currency TEXT DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'paid', 'completed', 'cancelled')),
  creator_response TEXT, -- réponse du créateur
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  live_stream_id UUID REFERENCES public.live_streams(id) ON DELETE SET NULL, -- référence au live créé
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_private_live_requests_creator ON public.private_live_requests(creator_id);
CREATE INDEX idx_private_live_requests_requester ON public.private_live_requests(requester_id);
CREATE INDEX idx_private_live_requests_status ON public.private_live_requests(status);
CREATE INDEX idx_private_live_requests_date ON public.private_live_requests(proposed_date);

-- Enable RLS
ALTER TABLE public.private_live_requests ENABLE ROW LEVEL SECURITY;

-- Politique: les créateurs peuvent voir les demandes qui leur sont adressées
CREATE POLICY "Creators can view their private live requests"
ON public.private_live_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.id = creator_id AND c.user_id = auth.uid()
  )
);

-- Politique: les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "Users can view their own requests"
ON public.private_live_requests
FOR SELECT
USING (requester_id = auth.uid());

-- Politique: les utilisateurs authentifiés peuvent créer une demande
CREATE POLICY "Authenticated users can create requests"
ON public.private_live_requests
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND requester_id = auth.uid()
  AND status = 'pending'
);

-- Politique: les créateurs peuvent mettre à jour leurs demandes (accepter/refuser/prix)
CREATE POLICY "Creators can update requests"
ON public.private_live_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.id = creator_id AND c.user_id = auth.uid()
  )
);

-- Politique: le service role peut tout faire (pour les edge functions)
CREATE POLICY "Service role full access"
ON public.private_live_requests
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger pour updated_at
CREATE TRIGGER update_private_live_requests_updated_at
BEFORE UPDATE ON public.private_live_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table pour tracker les revenus des lives privés (pour les commissions)
CREATE TABLE public.private_live_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  private_live_request_id UUID NOT NULL REFERENCES public.private_live_requests(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gross_amount NUMERIC(10,2) NOT NULL,
  platform_commission NUMERIC(10,2) NOT NULL,
  creator_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS pour private_live_revenue
ALTER TABLE public.private_live_revenue ENABLE ROW LEVEL SECURITY;

-- Créateurs peuvent voir leurs revenus
CREATE POLICY "Creators can view their private live revenue"
ON public.private_live_revenue
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.id = creator_id AND c.user_id = auth.uid()
  )
);

-- Admins peuvent tout voir
CREATE POLICY "Admins can view all private live revenue"
ON public.private_live_revenue
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Service role full access
CREATE POLICY "Service role full access revenue"
ON public.private_live_revenue
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');