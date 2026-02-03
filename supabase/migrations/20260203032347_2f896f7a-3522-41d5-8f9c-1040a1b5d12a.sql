-- Simuler le paiement de 200€ pour le live du 5 février
UPDATE private_live_requests 
SET 
  status = 'paid',
  paid_at = NOW(),
  updated_at = NOW()
WHERE id = '2f0abd3d-737e-42e5-886a-3ac6cd257c94'
AND status = 'accepted';