-- Mettre le prix d'abonnement d'Ice Scream à 0 pour test
UPDATE creators 
SET subscription_price = 0 
WHERE id = '50fa5b6c-5412-4979-be2f-d2e97093770d';

-- Ajouter du contenu de test pour Ice Scream
INSERT INTO content (creator_id, title, description, file_url, content_type, status, is_premium, is_preview, view_count, like_count) VALUES
('50fa5b6c-5412-4979-be2f-d2e97093770d', 'Photo de profil', 'Ma première photo', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'image', 'published', false, false, 42, 12),
('50fa5b6c-5412-4979-be2f-d2e97093770d', 'Contenu exclusif 1', 'Réservé aux abonnés', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400', 'image', 'published', true, false, 156, 45),
('50fa5b6c-5412-4979-be2f-d2e97093770d', 'Contenu exclusif 2', 'Autre contenu premium', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', 'image', 'published', true, false, 89, 23);