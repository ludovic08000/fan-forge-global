-- Add horizontal cover position column
ALTER TABLE public.profiles 
ADD COLUMN cover_position_x integer DEFAULT 50;

COMMENT ON COLUMN public.profiles.cover_position_x IS 'Horizontal position of cover image as percentage (0=left, 50=center, 100=right)';