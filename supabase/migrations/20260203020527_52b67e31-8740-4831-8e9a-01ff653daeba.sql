-- Ajouter les colonnes pour la gestion des annulations et no-show
ALTER TABLE public.private_live_requests 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS no_show_reported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS no_show_reported_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false;

-- Ajouter les colonnes de remboursement à la table des revenus
ALTER TABLE public.private_live_revenue
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Index pour les rappels à envoyer
CREATE INDEX IF NOT EXISTS idx_private_live_requests_reminders 
ON public.private_live_requests (proposed_date, status, reminder_24h_sent, reminder_1h_sent)
WHERE status = 'paid';