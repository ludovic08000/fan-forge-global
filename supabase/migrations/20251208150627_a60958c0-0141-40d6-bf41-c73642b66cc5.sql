-- Table pour les factures des créateurs
CREATE TABLE public.creator_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  
  -- Période de facturation
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Montants
  subscription_revenue NUMERIC NOT NULL DEFAULT 0,
  tips_revenue NUMERIC NOT NULL DEFAULT 0,
  live_revenue NUMERIC NOT NULL DEFAULT 0,
  private_content_revenue NUMERIC NOT NULL DEFAULT 0,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- Commission plateforme
  platform_commission_rate NUMERIC NOT NULL DEFAULT 0.15,
  platform_commission_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- TVA
  creator_country TEXT NOT NULL DEFAULT 'FR',
  vat_rate NUMERIC NOT NULL DEFAULT 0.20,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- Montant net à payer
  net_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- Informations créateur (copiées pour historique)
  creator_name TEXT NOT NULL,
  creator_address TEXT,
  creator_tax_id TEXT,
  creator_iban TEXT,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_request_id UUID REFERENCES public.creator_payment_requests(id)
);

-- Index pour recherche rapide
CREATE INDEX idx_creator_invoices_creator ON public.creator_invoices(creator_id);
CREATE INDEX idx_creator_invoices_period ON public.creator_invoices(period_start, period_end);
CREATE INDEX idx_creator_invoices_status ON public.creator_invoices(status);

-- Activer RLS
ALTER TABLE public.creator_invoices ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Créateurs peuvent voir leurs factures"
ON public.creator_invoices FOR SELECT
USING (creator_id IN (
  SELECT id FROM public.creators WHERE user_id = auth.uid()
));

CREATE POLICY "Admins peuvent gérer toutes les factures"
ON public.creator_invoices FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Fonction pour générer un numéro de facture
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
  invoice_num TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 8 FOR 6) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM creator_invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '-%';
  
  invoice_num := 'INV-' || year_month || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN invoice_num;
END;
$$;