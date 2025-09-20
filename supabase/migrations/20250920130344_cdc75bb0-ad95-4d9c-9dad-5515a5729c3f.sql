-- Créer une table pour les messages privés entre créateurs et abonnés
CREATE TABLE public.private_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  subscriber_id UUID NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'video', 'image')),
  content TEXT,
  media_url TEXT,
  media_thumbnail TEXT,
  price NUMERIC DEFAULT 0.00,
  is_paid BOOLEAN DEFAULT FALSE,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer une table pour les paiements de contenu privé
CREATE TABLE public.private_content_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  subscriber_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_content_payments ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour private_messages
CREATE POLICY "Créateurs peuvent voir leurs messages privés" 
ON public.private_messages 
FOR SELECT 
USING (creator_id IN (
  SELECT id FROM creators WHERE user_id = auth.uid()
));

CREATE POLICY "Abonnés peuvent voir leurs messages privés" 
ON public.private_messages 
FOR SELECT 
USING (subscriber_id = auth.uid() AND 
  (price = 0 OR is_paid = TRUE OR creator_id IN (
    SELECT creator_id FROM subscriptions 
    WHERE subscriber_id = auth.uid() AND status = 'active'
  ))
);

CREATE POLICY "Créateurs peuvent envoyer des messages privés" 
ON public.private_messages 
FOR INSERT 
WITH CHECK (creator_id IN (
  SELECT id FROM creators WHERE user_id = auth.uid()
));

CREATE POLICY "Abonnés peuvent envoyer des messages privés" 
ON public.private_messages 
FOR INSERT 
WITH CHECK (subscriber_id = auth.uid() AND 
  creator_id IN (
    SELECT creator_id FROM subscriptions 
    WHERE subscriber_id = auth.uid() AND status = 'active'
  )
);

-- Politiques RLS pour private_content_payments
CREATE POLICY "Utilisateurs peuvent voir leurs paiements de contenu privé" 
ON public.private_content_payments 
FOR SELECT 
USING (subscriber_id = auth.uid());

CREATE POLICY "Créateurs peuvent voir les paiements de leur contenu" 
ON public.private_content_payments 
FOR SELECT 
USING (message_id IN (
  SELECT id FROM private_messages 
  WHERE creator_id IN (
    SELECT id FROM creators WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Utilisateurs peuvent créer des paiements de contenu privé" 
ON public.private_content_payments 
FOR INSERT 
WITH CHECK (subscriber_id = auth.uid());

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_private_messages_updated_at
  BEFORE UPDATE ON public.private_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter des index pour les performances
CREATE INDEX idx_private_messages_creator_subscriber ON public.private_messages(creator_id, subscriber_id);
CREATE INDEX idx_private_messages_created_at ON public.private_messages(created_at);
CREATE INDEX idx_private_content_payments_message_id ON public.private_content_payments(message_id);