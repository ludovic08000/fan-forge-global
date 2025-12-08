-- Ajouter un type de message pour distinguer les offres de contenu
ALTER TABLE public.live_stream_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS content_offer JSONB DEFAULT NULL;

-- Commentaire: content_offer contient {content_id, title, price, thumbnail_url} pour les offres