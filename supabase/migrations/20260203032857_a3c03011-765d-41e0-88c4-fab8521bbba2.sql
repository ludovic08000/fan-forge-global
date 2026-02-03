-- Envoyer le message de confirmation au créateur pour le live privé payé
INSERT INTO private_messages (
  creator_id,
  subscriber_id,
  sender_id,
  message_type,
  content
) VALUES (
  'e5d0249c-1bed-4aa6-a7e8-fee2ca88a822',
  '584cddb3-dbf9-4d93-ab08-2bc42581e817',
  '584cddb3-dbf9-4d93-ab08-2bc42581e817',
  'text',
  '💰 **Paiement reçu - Live privé confirmé !**

coycault ludovic a payé **200€** pour votre live privé.

📅 **Date:** jeudi 5 février à 17:30
⏱️ **Durée:** 15 minutes
💵 **Votre gain:** 170.00€ (après commission)

N''oubliez pas de lancer le live à l''heure prévue ! 🎬'
);