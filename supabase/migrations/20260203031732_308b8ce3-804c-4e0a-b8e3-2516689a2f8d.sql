-- Insert notifications for accepted requests
INSERT INTO notifications (user_id, type, title, message, data)
VALUES 
  (
    '584cddb3-dbf9-4d93-ab08-2bc42581e817',
    'live_accepted',
    'ice scream a accepté votre live privé ! 🎬',
    'Payez 200€ pour confirmer votre live du jeudi 5 février 2026 à 17:30',
    '{"request_id": "2f0abd3d-737e-42e5-886a-3ac6cd257c94", "price": 200}'::jsonb
  ),
  (
    '584cddb3-dbf9-4d93-ab08-2bc42581e817',
    'live_accepted', 
    'ice scream a accepté votre live privé ! 🎬',
    'Payez 100€ pour confirmer votre live du mercredi 4 février 2026 à 23:19',
    '{"request_id": "9af9b531-c081-44a5-8eb9-2968e09eb518", "price": 100}'::jsonb
  );

-- Insert private messages from creator to requester
INSERT INTO private_messages (creator_id, subscriber_id, sender_id, message_type, content)
VALUES
  (
    'e5d0249c-1bed-4aa6-a7e8-fee2ca88a822',
    '584cddb3-dbf9-4d93-ab08-2bc42581e817',
    '5370a959-9b20-4232-9d30-205a01f9db6f',
    'text',
    '🎉 **Bonne nouvelle !** Votre demande de live privé est acceptée !

📅 **Date confirmée:** Jeudi 5 février 2026 à 17:30
⏱️ **Durée:** 15 minutes
💰 **Prix:** 200€

🔥 **Payez maintenant pour réserver votre place !**

➡️ Rendez-vous dans **Mes demandes** pour finaliser le paiement et confirmer votre session exclusive avec moi !'
  ),
  (
    'e5d0249c-1bed-4aa6-a7e8-fee2ca88a822',
    '584cddb3-dbf9-4d93-ab08-2bc42581e817',
    '5370a959-9b20-4232-9d30-205a01f9db6f',
    'text',
    '🎉 **Bonne nouvelle !** Votre demande de live privé est acceptée !

📅 **Date confirmée:** Mercredi 4 février 2026 à 23:19
⏱️ **Durée:** 30 minutes
💰 **Prix:** 100€

🔥 **Payez maintenant pour réserver votre place !**

➡️ Rendez-vous dans **Mes demandes** pour finaliser le paiement et confirmer votre session exclusive avec moi !'
  );