-- Add cover_position column to store the vertical position percentage (0-100)
ALTER TABLE public.profiles 
ADD COLUMN cover_position integer DEFAULT 50;

-- Add a comment to explain the column
COMMENT ON COLUMN public.profiles.cover_position IS 'Vertical position of cover image as percentage (0=top, 50=center, 100=bottom)';