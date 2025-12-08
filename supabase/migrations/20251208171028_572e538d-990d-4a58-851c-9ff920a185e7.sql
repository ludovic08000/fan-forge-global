
-- =============================================
-- RENFORCEMENT SÉCURITÉ CONTENU CRÉATEUR
-- =============================================

-- 1. Supprimer les anciennes policies de contenu qui sont trop permissives
DROP POLICY IF EXISTS "Everyone can view preview content" ON public.content;
DROP POLICY IF EXISTS "Subscribers can view all creator content" ON public.content;

-- 2. Nouvelle policy: Contenu gratuit visible par tous (non-premium, non-preview requis)
CREATE POLICY "Public can view free published content"
ON public.content
FOR SELECT
USING (
  status = 'published'::content_status 
  AND is_premium = false
);

-- 3. Nouvelle policy: Contenu preview visible par tous (aperçu flou/teaser)
CREATE POLICY "Public can view preview content"
ON public.content
FOR SELECT
USING (
  status = 'published'::content_status 
  AND is_preview = true
);

-- 4. Nouvelle policy: Abonnés actifs peuvent voir le contenu premium de leur créateur
CREATE POLICY "Subscribers can view premium content"
ON public.content
FOR SELECT
USING (
  status = 'published'::content_status 
  AND is_premium = true
  AND is_subscribed_to_creator(auth.uid(), creator_id)
);

-- 5. Policy pour les admins
CREATE POLICY "Admins can view all content"
ON public.content
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_role)
);

-- =============================================
-- SÉCURISER LE STORAGE CONTENT
-- =============================================

-- Supprimer l'ancienne policy trop permissive sur le storage
DROP POLICY IF EXISTS "Subscribers can view content they have access to" ON storage.objects;

-- Nouvelle policy plus stricte pour le bucket content
-- Les fichiers ne sont accessibles que via URLs signées générées côté serveur
CREATE POLICY "Content bucket restricted access"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'content'
  AND (
    -- Le créateur peut voir son propre contenu
    (auth.uid())::text = (storage.foldername(name))[1]
    -- OU l'utilisateur a un abonnement actif au créateur
    OR EXISTS (
      SELECT 1
      FROM subscriptions s
      JOIN creators c ON c.id = s.creator_id
      WHERE s.subscriber_id = auth.uid()
        AND (c.user_id)::text = (storage.foldername(name))[1]
        AND s.status = 'active'::subscription_status
        AND (s.end_date IS NULL OR s.end_date > NOW())
    )
    -- OU l'utilisateur a payé pour ce contenu privé spécifique
    OR EXISTS (
      SELECT 1
      FROM private_content_payments pcp
      JOIN private_messages pm ON pm.id = pcp.message_id
      WHERE pcp.subscriber_id = auth.uid()
        AND pcp.status = 'paid'
        AND pm.media_url LIKE '%' || name || '%'
    )
    -- OU c'est un admin
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::user_role
    )
  )
);

-- =============================================
-- SÉCURISER LES LIVES PREMIUM
-- =============================================

-- Supprimer les anciennes policies lives
DROP POLICY IF EXISTS "Tout le monde peut voir les lives publics" ON public.live_streams;
DROP POLICY IF EXISTS "Abonnés peuvent voir les lives premium" ON public.live_streams;

-- Les lives gratuits sont visibles par tous
CREATE POLICY "Public can view free live streams"
ON public.live_streams
FOR SELECT
USING (
  is_premium = false
);

-- Les lives premium nécessitent abonnement OU paiement unique
CREATE POLICY "Subscribers can view premium live streams"
ON public.live_streams
FOR SELECT
USING (
  is_premium = true
  AND (
    -- Abonné au créateur
    is_subscribed_to_creator(auth.uid(), creator_id)
    -- OU a payé l'accès unique
    OR EXISTS (
      SELECT 1 FROM live_stream_payments lsp
      WHERE lsp.live_stream_id = live_streams.id
        AND lsp.subscriber_id = auth.uid()
        AND lsp.status = 'paid'
    )
    -- OU est le créateur lui-même
    OR creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  )
);

-- =============================================
-- SÉCURISER LES MESSAGES LIVE (chat)
-- =============================================

-- Supprimer l'ancienne policy trop permissive
DROP POLICY IF EXISTS "Utilisateurs peuvent voir les messages des lives qu'ils regarde" ON public.live_stream_messages;

-- Seuls ceux qui ont accès au live peuvent voir les messages
CREATE POLICY "Users with live access can view messages"
ON public.live_stream_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM live_streams ls
    WHERE ls.id = live_stream_messages.live_stream_id
    AND (
      ls.is_premium = false
      OR is_subscribed_to_creator(auth.uid(), ls.creator_id)
      OR EXISTS (
        SELECT 1 FROM live_stream_payments lsp
        WHERE lsp.live_stream_id = ls.id
          AND lsp.subscriber_id = auth.uid()
          AND lsp.status = 'paid'
      )
      OR ls.creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
    )
  )
);
