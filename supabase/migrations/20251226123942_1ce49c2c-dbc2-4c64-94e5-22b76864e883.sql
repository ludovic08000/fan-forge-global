-- Drop the existing check constraint
ALTER TABLE public.private_messages 
DROP CONSTRAINT private_messages_message_type_check;

-- Add the new check constraint with additional message types for subscriber requests
ALTER TABLE public.private_messages 
ADD CONSTRAINT private_messages_message_type_check 
CHECK (message_type = ANY (ARRAY['text'::text, 'video'::text, 'image'::text, 'video_request'::text, 'image_request'::text]));