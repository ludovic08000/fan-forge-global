-- Add media_url column to creator_auto_messages for attachments
ALTER TABLE public.creator_auto_messages
ADD COLUMN media_url TEXT,
ADD COLUMN media_type TEXT CHECK (media_type IN ('image', 'video'));