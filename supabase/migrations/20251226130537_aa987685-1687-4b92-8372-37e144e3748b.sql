-- Add sender_id to track who actually sent the message (sans foreign key pour éviter les problèmes)
ALTER TABLE public.private_messages 
ADD COLUMN IF NOT EXISTS sender_id UUID;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_private_messages_sender_id ON public.private_messages(sender_id);

-- Update existing messages based on message_type:
-- Media content (image, video, paid_image, paid_video) = sent by creator
UPDATE public.private_messages 
SET sender_id = (
  SELECT c.user_id FROM public.creators c WHERE c.id = private_messages.creator_id
)
WHERE message_type IN ('image', 'video', 'paid_image', 'paid_video') AND sender_id IS NULL;

-- For text and requests, we need to get the user_id from profiles where subscriber_id matches
UPDATE public.private_messages 
SET sender_id = subscriber_id
WHERE message_type IN ('text', 'image_request', 'video_request') AND sender_id IS NULL;