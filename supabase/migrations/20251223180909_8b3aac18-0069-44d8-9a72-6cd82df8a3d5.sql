-- Insérer des messages de test entre les utilisateurs réels et les créateurs
-- Conversation 1: Utilisateur djquake avec Maya Fitness
INSERT INTO public.private_messages (creator_id, subscriber_id, content, message_type, created_at) VALUES
('02cd1fd0-f8bd-4f14-ab14-cb753fd15068', 'ce10458c-56ef-4f9a-82b0-896958e790dc', 'Salut ! Bienvenue sur mon profil 🔥', 'text', NOW() - INTERVAL '2 hours'),
('02cd1fd0-f8bd-4f14-ab14-cb753fd15068', 'ce10458c-56ef-4f9a-82b0-896958e790dc', 'Merci de t''être abonné !', 'text', NOW() - INTERVAL '1 hour 50 minutes');

-- Réponse du subscriber
INSERT INTO public.private_messages (creator_id, subscriber_id, content, message_type, created_at) VALUES
('02cd1fd0-f8bd-4f14-ab14-cb753fd15068', 'ce10458c-56ef-4f9a-82b0-896958e790dc', 'Merci Maya ! J''adore ton contenu fitness 💪', 'text', NOW() - INTERVAL '1 hour 30 minutes'),
('02cd1fd0-f8bd-4f14-ab14-cb753fd15068', 'ce10458c-56ef-4f9a-82b0-896958e790dc', 'Tu postes quand ta prochaine vidéo ?', 'text', NOW() - INTERVAL '1 hour');

-- Conversation 2: Utilisateur avec Alex Photography  
INSERT INTO public.private_messages (creator_id, subscriber_id, content, message_type, created_at) VALUES
('ba74dcc6-c0b5-4cae-973c-eb910f753396', 'ce10458c-56ef-4f9a-82b0-896958e790dc', 'Hey ! Merci pour ton soutien 📸', 'text', NOW() - INTERVAL '1 day'),
('ba74dcc6-c0b5-4cae-973c-eb910f753396', 'ce10458c-56ef-4f9a-82b0-896958e790dc', 'J''ai un nouveau shooting exclusif bientôt !', 'text', NOW() - INTERVAL '23 hours');

INSERT INTO public.private_messages (creator_id, subscriber_id, content, message_type, created_at) VALUES
('ba74dcc6-c0b5-4cae-973c-eb910f753396', 'ce10458c-56ef-4f9a-82b0-896958e790dc', 'Trop hâte de voir ça ! 🔥', 'text', NOW() - INTERVAL '20 hours');

-- Conversation 3: Utilisateur avec Sophie Creative
INSERT INTO public.private_messages (creator_id, subscriber_id, content, message_type, created_at) VALUES
('4f60b5cb-ffb9-447a-994b-1677161b37dd', 'ce10458c-56ef-4f9a-82b0-896958e790dc', 'Coucou ! Un petit message pour te remercier 💕', 'text', NOW() - INTERVAL '3 days'),
('4f60b5cb-ffb9-447a-994b-1677161b37dd', 'ce10458c-56ef-4f9a-82b0-896958e790dc', 'Tes créations sont incroyables Sophie !', 'text', NOW() - INTERVAL '2 days 12 hours');

-- Conversation 4: Avec un second utilisateur (ludovic.coycault)
INSERT INTO public.private_messages (creator_id, subscriber_id, content, message_type, created_at) VALUES
('02cd1fd0-f8bd-4f14-ab14-cb753fd15068', '5f3fc1a0-e340-45e5-a9e8-0881bd921f4b', 'Bienvenue ! 🎉', 'text', NOW() - INTERVAL '5 hours'),
('02cd1fd0-f8bd-4f14-ab14-cb753fd15068', '5f3fc1a0-e340-45e5-a9e8-0881bd921f4b', 'Salut Maya, super contenu !', 'text', NOW() - INTERVAL '4 hours');

-- Message avec contenu payant (exemple)
INSERT INTO public.private_messages (creator_id, subscriber_id, content, message_type, price, is_paid, created_at) VALUES
('02cd1fd0-f8bd-4f14-ab14-cb753fd15068', 'ce10458c-56ef-4f9a-82b0-896958e790dc', 'Voici du contenu exclusif pour toi 😘', 'image', 5.99, false, NOW() - INTERVAL '30 minutes');