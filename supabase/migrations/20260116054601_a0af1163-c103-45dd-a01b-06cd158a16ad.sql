-- Rendre le bucket content public pour que les images soient accessibles
UPDATE storage.buckets 
SET public = true 
WHERE id = 'content';