-- Table pour suivre les demandes et historique de paiements
CREATE TABLE IF NOT EXISTS public.creator_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_transfer_id TEXT,
  error_message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour rechercher les paiements par créateur
CREATE INDEX IF NOT EXISTS idx_payment_requests_creator ON public.creator_payment_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.creator_payment_requests(status);

-- RLS policies
ALTER TABLE public.creator_payment_requests ENABLE ROW LEVEL SECURITY;

-- Les créateurs peuvent voir leurs propres demandes
CREATE POLICY "Creators can view own payment requests"
  ON public.creator_payment_requests
  FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Les créateurs peuvent créer leurs propres demandes
CREATE POLICY "Creators can create own payment requests"
  ON public.creator_payment_requests
  FOR INSERT
  WITH CHECK (
    creator_id IN (
      SELECT id FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Les admins peuvent tout voir et modifier
CREATE POLICY "Admins can manage all payment requests"
  ON public.creator_payment_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_creator_payment_requests_updated_at
  BEFORE UPDATE ON public.creator_payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();