-- Table pour stocker les résultats de modération IA nécessitant une revue
CREATE TABLE public.ai_moderation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.private_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'image', 'video', 'document'
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Résultats IA
  ai_category TEXT, -- 'safe', 'adult', 'explicit', 'illegal', 'rejected', 'unknown'
  ai_confidence INTEGER DEFAULT 0,
  ai_recommendation TEXT NOT NULL, -- 'approve', 'manual_review', 'reject'
  ai_reason TEXT,
  ai_flags JSONB DEFAULT '{}',
  ai_issues TEXT[] DEFAULT '{}',
  ai_model TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- Statut de la revue admin
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  action_taken TEXT, -- 'approved', 'deleted', 'warned_user', 'banned_user'
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_ai_moderation_queue_status ON public.ai_moderation_queue(status);
CREATE INDEX idx_ai_moderation_queue_user_id ON public.ai_moderation_queue(user_id);
CREATE INDEX idx_ai_moderation_queue_recommendation ON public.ai_moderation_queue(ai_recommendation);
CREATE INDEX idx_ai_moderation_queue_created_at ON public.ai_moderation_queue(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_moderation_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view and manage
CREATE POLICY "Admins can view all moderation queue items"
  ON public.ai_moderation_queue
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update moderation queue items"
  ON public.ai_moderation_queue
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete moderation queue items"
  ON public.ai_moderation_queue
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow system to insert (via service role)
CREATE POLICY "System can insert moderation queue items"
  ON public.ai_moderation_queue
  FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_ai_moderation_queue_updated_at
  BEFORE UPDATE ON public.ai_moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();