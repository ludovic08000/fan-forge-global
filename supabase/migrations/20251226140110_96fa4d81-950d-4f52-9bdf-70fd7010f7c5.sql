-- Ajouter une colonne read_at pour suivre quand un message a été lu
ALTER TABLE public.private_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Créer un index pour améliorer les performances des requêtes sur les messages non lus
CREATE INDEX IF NOT EXISTS idx_private_messages_read_at 
ON public.private_messages(creator_id, sender_id, read_at) 
WHERE read_at IS NULL;