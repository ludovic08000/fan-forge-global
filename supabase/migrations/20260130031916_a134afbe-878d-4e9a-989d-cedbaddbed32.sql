-- SÉCURITÉ: Supprimer la policy permissive qui expose le contenu premium
-- Cette policy autorise l'accès public au bucket 'content' sans vérification

-- Supprimer les policies permissives existantes sur le bucket content
DROP POLICY IF EXISTS "content_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "content_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "content_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "content_delete_policy" ON storage.objects;

-- Note: Les policies restrictives existantes restent en place:
-- - "Content bucket restricted access" pour SELECT (vérifie propriétaire/abonnement)
-- - "Creators can view their own content" pour SELECT
-- - "Creators can upload their own content" pour INSERT
-- - "Creators can update their own content" pour UPDATE  
-- - "Creators can delete their own content" pour DELETE

-- Vérification: s'assurer que la policy restrictive existe toujours
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Content bucket restricted access'
  ) THEN
    RAISE NOTICE 'Warning: Content bucket restricted access policy not found';
  END IF;
END $$;