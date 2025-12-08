-- Ajouter l'option d'enregistrement aux live streams
ALTER TABLE public.live_streams 
ADD COLUMN IF NOT EXISTS enable_recording BOOLEAN NOT NULL DEFAULT false;

-- Ajouter le champ is_preview au contenu pour distinguer preview vs contenu abonnés
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS is_preview BOOLEAN NOT NULL DEFAULT false;

-- Mettre à jour les politiques RLS pour le contenu preview
-- Le contenu preview est visible par tous, le contenu non-preview nécessite un abonnement
DROP POLICY IF EXISTS "Everyone can view published free content" ON public.content;
DROP POLICY IF EXISTS "Subscribers can view premium content" ON public.content;

-- Tout le monde peut voir le contenu preview (non-premium ou is_preview = true)
CREATE POLICY "Everyone can view preview content" 
ON public.content 
FOR SELECT 
USING (
  status = 'published'::content_status 
  AND (
    is_premium = false 
    OR is_preview = true
  )
);

-- Les abonnés peuvent voir tout le contenu publié du créateur
CREATE POLICY "Subscribers can view all creator content" 
ON public.content 
FOR SELECT 
USING (
  status = 'published'::content_status 
  AND (
    is_premium = false 
    OR is_preview = true
    OR is_subscribed_to_creator(auth.uid(), creator_id)
  )
);