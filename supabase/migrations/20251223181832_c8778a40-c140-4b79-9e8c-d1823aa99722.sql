-- Mettre le prix d'abonnement à 0 pour le créateur djquake (pour test)
UPDATE creators 
SET subscription_price = 0 
WHERE user_id = 'ce10458c-56ef-4f9a-82b0-896958e790dc';