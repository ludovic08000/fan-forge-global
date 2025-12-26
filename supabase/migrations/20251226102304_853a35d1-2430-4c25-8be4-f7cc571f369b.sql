-- Add deleted column to private_messages
ALTER TABLE public.private_messages 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_private_messages_deleted ON public.private_messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_private_messages_status ON public.private_messages(status);

-- Create policy to allow users to delete their own messages (soft delete)
CREATE POLICY "Users can update their own messages for deletion"
ON public.private_messages
FOR UPDATE
USING (
  auth.uid() IN (creator_id, subscriber_id)
)
WITH CHECK (
  -- Only the sender can mark as deleted
  (auth.uid() = creator_id AND message_type != 'text') OR
  (auth.uid() = subscriber_id AND message_type = 'text') OR
  -- Anyone in conversation can update status
  auth.uid() IN (creator_id, subscriber_id)
);

-- Enable realtime for private_messages updates
ALTER TABLE public.private_messages REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'private_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
  END IF;
END $$;