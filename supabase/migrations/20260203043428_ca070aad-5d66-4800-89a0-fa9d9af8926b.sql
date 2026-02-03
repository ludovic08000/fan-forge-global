-- Supprimer les replays qui ont été incorrectement ajoutés à la table content
DELETE FROM content WHERE file_url LIKE 'replays/%';

-- Ajouter un commentaire pour clarifier que les replays ne doivent pas être dans content
COMMENT ON TABLE content IS 'Contenu créé par les créateurs (images/vidéos). Les replays de lives ne doivent PAS être stockés ici - ils sont dans live_streams.recording_url ou private_live_replays.';