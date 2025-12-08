-- Ajouter la fonctionnalité de pause pour les créateurs
ALTER TABLE public.creators 
ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_at timestamp with time zone DEFAULT NULL;

-- Créer une fonction pour supprimer complètement un utilisateur et toutes ses données
CREATE OR REPLACE FUNCTION public.delete_user_completely(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Supprimer les photos de l'utilisateur
  DELETE FROM public.user_photos WHERE user_id = _user_id;
  
  -- Supprimer les vues de contenu
  DELETE FROM public.content_views WHERE viewer_id = _user_id;
  
  -- Supprimer les likes
  DELETE FROM public.content_likes WHERE user_id = _user_id;
  
  -- Supprimer les signalements
  DELETE FROM public.content_reports WHERE reporter_id = _user_id;
  
  -- Supprimer les follows
  DELETE FROM public.follows WHERE follower_id = _user_id;
  
  -- Supprimer les tips envoyés
  DELETE FROM public.tips WHERE sender_id = _user_id;
  
  -- Supprimer les notifications
  DELETE FROM public.notifications WHERE user_id = _user_id;
  
  -- Supprimer les rôles
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  
  -- Supprimer les suspensions
  DELETE FROM public.user_suspensions WHERE user_id = _user_id;
  
  -- Supprimer le profil
  DELETE FROM public.profiles WHERE user_id = _user_id;
END;
$$;

-- Fonction pour supprimer un créateur et toutes ses données
CREATE OR REPLACE FUNCTION public.delete_creator_completely(_creator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Récupérer le user_id du créateur
  SELECT user_id INTO _user_id FROM public.creators WHERE id = _creator_id;
  
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Supprimer les messages de live
  DELETE FROM public.live_stream_messages 
  WHERE live_stream_id IN (SELECT id FROM public.live_streams WHERE creator_id = _creator_id);
  
  -- Supprimer les bans de live
  DELETE FROM public.live_stream_bans 
  WHERE live_stream_id IN (SELECT id FROM public.live_streams WHERE creator_id = _creator_id);
  
  -- Supprimer les paramètres de live
  DELETE FROM public.live_stream_settings 
  WHERE live_stream_id IN (SELECT id FROM public.live_streams WHERE creator_id = _creator_id);
  
  -- Supprimer les viewers de live
  DELETE FROM public.live_stream_viewers 
  WHERE live_stream_id IN (SELECT id FROM public.live_streams WHERE creator_id = _creator_id);
  
  -- Supprimer les paiements de live
  DELETE FROM public.live_stream_payments 
  WHERE live_stream_id IN (SELECT id FROM public.live_streams WHERE creator_id = _creator_id);
  
  -- Supprimer les revenus de live
  DELETE FROM public.live_stream_revenue WHERE creator_id = _creator_id;
  
  -- Supprimer les lives
  DELETE FROM public.live_streams WHERE creator_id = _creator_id;
  
  -- Supprimer les messages privés et leurs paiements
  DELETE FROM public.private_content_payments 
  WHERE message_id IN (SELECT id FROM public.private_messages WHERE creator_id = _creator_id);
  DELETE FROM public.private_messages WHERE creator_id = _creator_id;
  
  -- Supprimer les codes de parrainage
  DELETE FROM public.referral_uses 
  WHERE referral_code_id IN (SELECT id FROM public.referral_codes WHERE creator_id = _creator_id);
  DELETE FROM public.referral_codes WHERE creator_id = _creator_id;
  
  -- Supprimer les abonnements
  DELETE FROM public.subscriptions WHERE creator_id = _creator_id;
  
  -- Supprimer les tips reçus
  DELETE FROM public.tips WHERE creator_id = _creator_id;
  
  -- Supprimer les signalements de contenu
  DELETE FROM public.content_reports 
  WHERE content_id IN (SELECT id FROM public.content WHERE creator_id = _creator_id);
  
  -- Supprimer les vues de contenu
  DELETE FROM public.content_views 
  WHERE content_id IN (SELECT id FROM public.content WHERE creator_id = _creator_id);
  
  -- Supprimer les likes de contenu
  DELETE FROM public.content_likes 
  WHERE content_id IN (SELECT id FROM public.content WHERE creator_id = _creator_id);
  
  -- Supprimer le contenu
  DELETE FROM public.content WHERE creator_id = _creator_id;
  
  -- Supprimer les commissions
  DELETE FROM public.platform_commissions WHERE creator_id = _creator_id;
  
  -- Supprimer les demandes de paiement
  DELETE FROM public.creator_payment_requests WHERE creator_id = _creator_id;
  
  -- Supprimer les factures
  DELETE FROM public.creator_invoices WHERE creator_id = _creator_id;
  
  -- Supprimer les follows vers ce créateur
  DELETE FROM public.follows WHERE creator_id = _creator_id;
  
  -- Supprimer le créateur
  DELETE FROM public.creators WHERE id = _creator_id;
  
  -- Supprimer l'utilisateur complètement
  PERFORM public.delete_user_completely(_user_id);
END;
$$;

-- Fonction pour nettoyer les créateurs en pause depuis plus d'un mois
CREATE OR REPLACE FUNCTION public.cleanup_paused_creators()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
  _creator_id uuid;
BEGIN
  FOR _creator_id IN 
    SELECT id FROM public.creators 
    WHERE is_paused = true 
    AND paused_at < NOW() - INTERVAL '1 month'
  LOOP
    PERFORM public.delete_creator_completely(_creator_id);
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$;

-- Permettre aux admins de supprimer des utilisateurs
CREATE POLICY "Admins can delete user data"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));