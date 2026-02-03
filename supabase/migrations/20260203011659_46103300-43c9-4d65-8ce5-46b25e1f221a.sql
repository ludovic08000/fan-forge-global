-- Ajouter le champ partnership_type à creator_partnerships s'il n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creator_partnerships' AND column_name = 'partnership_type') THEN
    ALTER TABLE public.creator_partnerships ADD COLUMN partnership_type TEXT DEFAULT 'collaboration' CHECK (partnership_type IN ('collaboration', 'permanent', 'affiliation'));
  END IF;
END $$;

-- Table des codes d'affiliation
CREATE TABLE IF NOT EXISTS public.creator_referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC NOT NULL DEFAULT 10 CHECK (commission_rate >= 1 AND commission_rate <= 30),
  uses_count INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des utilisations de codes d'affiliation
CREATE TABLE IF NOT EXISTS public.referral_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES public.creator_referral_codes(id) ON DELETE CASCADE,
  referrer_creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  subscribed_to_creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  commission_paid NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist before recreating
DROP POLICY IF EXISTS "Anyone can view active referral codes" ON public.creator_referral_codes;
DROP POLICY IF EXISTS "Creators can manage their referral codes" ON public.creator_referral_codes;
DROP POLICY IF EXISTS "Referrer can view their referral subscriptions" ON public.referral_subscriptions;
DROP POLICY IF EXISTS "System can insert referral subscriptions" ON public.referral_subscriptions;

-- Policies pour creator_referral_codes
CREATE POLICY "Anyone can view active referral codes"
ON public.creator_referral_codes FOR SELECT
USING (is_active = true);

CREATE POLICY "Creators can manage their referral codes"
ON public.creator_referral_codes FOR ALL
USING (
  EXISTS (SELECT 1 FROM creators WHERE id = creator_id AND user_id = auth.uid())
);

-- Policies pour referral_subscriptions
CREATE POLICY "Referrer can view their referral subscriptions"
ON public.referral_subscriptions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM creators WHERE id = referrer_creator_id AND user_id = auth.uid())
);

CREATE POLICY "System can insert referral subscriptions"
ON public.referral_subscriptions FOR INSERT
WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.creator_referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_creator ON public.creator_referral_codes(creator_id);
CREATE INDEX IF NOT EXISTS idx_referral_subs_referrer ON public.referral_subscriptions(referrer_creator_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creator_referral_codes_updated_at ON public.creator_referral_codes;
CREATE TRIGGER update_creator_referral_codes_updated_at
BEFORE UPDATE ON public.creator_referral_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();