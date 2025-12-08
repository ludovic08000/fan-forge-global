-- Ajouter une colonne pour le dernier heartbeat du créateur
ALTER TABLE public.live_streams 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Créer un index pour les recherches de lives sans heartbeat
CREATE INDEX IF NOT EXISTS idx_live_streams_heartbeat ON live_streams(status, last_heartbeat) WHERE status = 'live';