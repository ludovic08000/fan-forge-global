-- Ajouter les informations bancaires pour les créateurs
ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
ADD COLUMN IF NOT EXISTS bank_iban TEXT,
ADD COLUMN IF NOT EXISTS bank_bic TEXT,
ADD COLUMN IF NOT EXISTS bank_country TEXT DEFAULT 'FR',
ADD COLUMN IF NOT EXISTS tax_id TEXT;