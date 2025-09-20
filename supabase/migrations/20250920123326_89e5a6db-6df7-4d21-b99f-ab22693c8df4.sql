-- Création des buckets de stockage pour le contenu

-- Bucket pour les images/vidéos de contenu
INSERT INTO storage.buckets (id, name, public) VALUES ('content', 'content', false);

-- Bucket pour les miniatures (publiques)
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);

-- Bucket pour les avatars (publiques)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Bucket pour les covers (publiques)
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);

-- Politiques pour le bucket content (contenu premium)
CREATE POLICY "Creators can upload their own content" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'content' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Creators can view their own content" ON storage.objects
FOR SELECT USING (
  bucket_id = 'content' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Subscribers can view content they have access to" ON storage.objects
FOR SELECT USING (
  bucket_id = 'content' AND
  (
    -- Le créateur peut voir son propre contenu
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Les abonnés peuvent voir le contenu des créateurs auxquels ils sont abonnés
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      JOIN public.creators c ON c.id = s.creator_id
      WHERE s.subscriber_id = auth.uid()
        AND c.user_id::text = (storage.foldername(name))[1]
        AND s.status = 'active'
        AND (s.end_date IS NULL OR s.end_date > now())
    ) OR
    -- Les admins peuvent tout voir
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
);

CREATE POLICY "Creators can update their own content" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'content' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Creators can delete their own content" ON storage.objects
FOR DELETE USING (
  bucket_id = 'content' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Politiques pour le bucket thumbnails (public)
CREATE POLICY "Anyone can view thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "Creators can upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Creators can update their thumbnails" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'thumbnails' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Creators can delete their thumbnails" ON storage.objects
FOR DELETE USING (
  bucket_id = 'thumbnails' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Politiques pour le bucket avatars (public)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Politiques pour le bucket covers (public)
CREATE POLICY "Anyone can view covers" ON storage.objects
FOR SELECT USING (bucket_id = 'covers');

CREATE POLICY "Users can upload their cover" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their cover" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their cover" ON storage.objects
FOR DELETE USING (
  bucket_id = 'covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);