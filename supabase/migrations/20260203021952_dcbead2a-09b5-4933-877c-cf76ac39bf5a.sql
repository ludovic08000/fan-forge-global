
-- Insérer une demande de réservation test pour demain à 20h
INSERT INTO private_live_requests (
  creator_id,
  requester_id,
  proposed_date,
  proposed_duration,
  message,
  status
) VALUES (
  'e5d0249c-1bed-4aa6-a7e8-fee2ca88a822',
  '584cddb3-dbf9-4d93-ab08-2bc42581e817',
  NOW() + INTERVAL '1 day' + INTERVAL '20 hours',
  30,
  'Salut ! J''aimerais un live privé avec toi demain soir, tu es dispo ?',
  'pending'
);
