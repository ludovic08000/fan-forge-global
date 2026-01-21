-- Mettre à jour les URLs R2 existantes avec le bon domaine public
UPDATE content 
SET file_url = REPLACE(file_url, 'pub-4a08a43014755cc4516a7df72c2dac70.r2.dev', 'pub-70ffb1b2cbbb4074b7c416e5cb63aeeb.r2.dev') 
WHERE file_url LIKE '%pub-4a08a43014755cc4516a7df72c2dac70.r2.dev%';

-- Aussi mettre à jour les recording_url dans live_streams
UPDATE live_streams 
SET recording_url = REPLACE(recording_url, 'pub-4a08a43014755cc4516a7df72c2dac70.r2.dev', 'pub-70ffb1b2cbbb4074b7c416e5cb63aeeb.r2.dev') 
WHERE recording_url LIKE '%pub-4a08a43014755cc4516a7df72c2dac70.r2.dev%';