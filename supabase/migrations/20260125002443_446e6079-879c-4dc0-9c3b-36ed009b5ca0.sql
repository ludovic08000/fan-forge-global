-- Add preferred_language column to creators table
ALTER TABLE public.creators 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'fr';

-- Add comment for documentation
COMMENT ON COLUMN public.creators.preferred_language IS 'Code de langue préféré du créateur (fr, en, es, de, it, pt, nl, ja, zh, ar)';