-- Réinitialiser le stripe_price_id pour "ice scream" afin de forcer la création d'un nouveau prix à 10€
UPDATE creators 
SET stripe_price_id = NULL 
WHERE id = '50fa5b6c-5412-4979-be2f-d2e97093770d';