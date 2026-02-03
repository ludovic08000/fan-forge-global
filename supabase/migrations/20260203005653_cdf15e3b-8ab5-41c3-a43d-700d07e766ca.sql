-- Table pour les messages automatiques des créateurs
CREATE TABLE public.creator_auto_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('welcome', 'expiration_warning', 'expiration_final', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  days_before_expiration INTEGER DEFAULT NULL, -- Pour les messages d'expiration (ex: 7 jours, 1 jour)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creator_id, message_type, days_before_expiration)
);

-- Index pour les recherches rapides
CREATE INDEX idx_creator_auto_messages_creator ON public.creator_auto_messages(creator_id);
CREATE INDEX idx_creator_auto_messages_type ON public.creator_auto_messages(message_type, is_enabled);

-- Enable RLS
ALTER TABLE public.creator_auto_messages ENABLE ROW LEVEL SECURITY;

-- Créateurs peuvent voir/modifier leurs propres messages
CREATE POLICY "Creators can manage their auto messages"
ON public.creator_auto_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.creators 
    WHERE id = creator_auto_messages.creator_id 
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.creators 
    WHERE id = creator_auto_messages.creator_id 
    AND user_id = auth.uid()
  )
);

-- Admins peuvent tout voir
CREATE POLICY "Admins can view all auto messages"
ON public.creator_auto_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Table pour tracker les messages envoyés (éviter les doublons)
CREATE TABLE public.auto_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, message_type)
);

-- Index pour vérifier rapidement si un message a été envoyé
CREATE INDEX idx_auto_message_logs_subscription ON public.auto_message_logs(subscription_id, message_type);

-- Enable RLS
ALTER TABLE public.auto_message_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les edge functions avec service role peuvent accéder
CREATE POLICY "Service role only for auto message logs"
ON public.auto_message_logs
FOR ALL
USING (false)
WITH CHECK (false);

-- Trigger pour updated_at
CREATE TRIGGER update_creator_auto_messages_updated_at
BEFORE UPDATE ON public.creator_auto_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();