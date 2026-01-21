-- Fix infinite recursion in private_messages RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view messages with verified payment" ON public.private_messages;
DROP POLICY IF EXISTS "Users can view their active conversations" ON public.private_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.private_messages;
DROP POLICY IF EXISTS "Users can update their conversation messages" ON public.private_messages;

-- Create a helper function to check if user is creator owner (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_creator_by_user_id(p_creator_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.creators 
    WHERE id = p_creator_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate policies using simple conditions to avoid recursion

-- SELECT policy: Users can view messages in their conversations
CREATE POLICY "Users can view their messages"
ON public.private_messages
FOR SELECT
USING (
  (is_deleted = false OR is_deleted IS NULL)
  AND (
    -- Subscriber can view their own messages (free or paid)
    (subscriber_id = auth.uid() AND (price IS NULL OR price = 0 OR is_paid = true))
    -- Creator can view all messages in their conversations
    OR is_creator_by_user_id(creator_id, auth.uid())
    -- Admin access
    OR has_role(auth.uid(), 'admin'::user_role)
  )
);

-- INSERT policy: Users can send messages in their conversations
CREATE POLICY "Users can send messages"
ON public.private_messages
FOR INSERT
WITH CHECK (
  -- Subscriber sending to creator
  subscriber_id = auth.uid()
  -- Creator replying to subscriber
  OR is_creator_by_user_id(creator_id, auth.uid())
);

-- UPDATE policy: Users can update messages in their conversations (mark as read, etc.)
CREATE POLICY "Users can update messages"
ON public.private_messages
FOR UPDATE
USING (
  subscriber_id = auth.uid()
  OR is_creator_by_user_id(creator_id, auth.uid())
)
WITH CHECK (
  subscriber_id = auth.uid()
  OR is_creator_by_user_id(creator_id, auth.uid())
);