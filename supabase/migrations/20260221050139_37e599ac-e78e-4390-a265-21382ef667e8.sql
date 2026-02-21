
-- Table pour archiver les preuves de contenu illégal (pédopornographie, etc.)
-- Ces données sont conservées même après suppression du compte pour dépôt de plainte
CREATE TABLE public.legal_evidence_archives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_user_id uuid NOT NULL,
  original_creator_id uuid,
  user_email text,
  user_ip_addresses jsonb DEFAULT '[]'::jsonb,
  login_timestamps jsonb DEFAULT '[]'::jsonb,
  stage_name text,
  full_name text,
  ai_moderation_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  flagged_content_urls text[] DEFAULT ARRAY[]::text[],
  r2_evidence_keys text[] DEFAULT ARRAY[]::text[],
  violation_type text NOT NULL,
  violation_details text,
  ai_confidence integer,
  ai_category text,
  original_content_id uuid,
  original_file_url text,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_by text NOT NULL DEFAULT 'system',
  identity_verification_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS: seuls les admins peuvent voir/gérer les preuves légales
ALTER TABLE public.legal_evidence_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view legal evidence"
ON public.legal_evidence_archives FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Only admins can insert legal evidence"
ON public.legal_evidence_archives FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert via service role"
ON public.legal_evidence_archives FOR INSERT
WITH CHECK (true);

-- Index pour recherche rapide
CREATE INDEX idx_legal_evidence_user_id ON public.legal_evidence_archives(original_user_id);
CREATE INDEX idx_legal_evidence_violation ON public.legal_evidence_archives(violation_type);

-- Fonction pour archiver les preuves d'un utilisateur flaggé par l'IA
CREATE OR REPLACE FUNCTION public.archive_illegal_content_evidence(_user_id uuid, _creator_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _moderation_record RECORD;
  _user_email text;
  _stage_name text;
  _identity_data jsonb;
BEGIN
  -- Récupérer l'email
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Récupérer le stage_name si créateur
  IF _creator_id IS NOT NULL THEN
    SELECT stage_name INTO _stage_name FROM public.creators WHERE id = _creator_id;
  END IF;
  
  -- Récupérer les données de vérification d'identité
  SELECT jsonb_build_object(
    'full_name', full_name,
    'birthdate', birthdate,
    'document_type', document_type,
    'document_number', document_number,
    'submitted_at', submitted_at,
    'status', status
  ) INTO _identity_data
  FROM public.identity_verifications
  WHERE user_id = _user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Archiver chaque contenu flaggé par l'IA comme illégal
  FOR _moderation_record IN
    SELECT * FROM public.ai_moderation_queue
    WHERE user_id = _user_id
    AND (
      ai_category IN ('illegal', 'child_exploitation', 'csam', 'violence_extreme')
      OR status IN ('quarantined', 'rejected')
    )
  LOOP
    INSERT INTO public.legal_evidence_archives (
      original_user_id,
      original_creator_id,
      user_email,
      stage_name,
      violation_type,
      violation_details,
      ai_confidence,
      ai_category,
      original_content_id,
      original_file_url,
      flagged_content_urls,
      r2_evidence_keys,
      ai_moderation_data,
      identity_verification_data,
      archived_by
    ) VALUES (
      _user_id,
      _creator_id,
      _user_email,
      _stage_name,
      COALESCE(_moderation_record.ai_category, 'unknown'),
      _moderation_record.ai_reason,
      _moderation_record.ai_confidence,
      _moderation_record.ai_category,
      _moderation_record.content_id,
      _moderation_record.file_url,
      ARRAY[_moderation_record.file_url],
      ARRAY[_moderation_record.file_url],
      jsonb_build_object(
        'ai_flags', _moderation_record.ai_flags,
        'ai_issues', _moderation_record.ai_issues,
        'ai_model', _moderation_record.ai_model,
        'ai_recommendation', _moderation_record.ai_recommendation,
        'analyzed_at', _moderation_record.analyzed_at,
        'reviewed_at', _moderation_record.reviewed_at,
        'reviewed_by', _moderation_record.reviewed_by,
        'action_taken', _moderation_record.action_taken
      ),
      _identity_data,
      'auto_deletion_archive'
    );
  END LOOP;
END;
$$;

-- Mettre à jour delete_creator_completely pour archiver les preuves AVANT suppression
CREATE OR REPLACE FUNCTION public.delete_creator_completely(_creator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT user_id INTO _user_id FROM public.creators WHERE id = _creator_id;
  
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- ÉTAPE 1: Archiver les preuves de contenu illégal AVANT toute suppression
  PERFORM public.archive_illegal_content_evidence(_user_id, _creator_id);
  
  -- ÉTAPE 2: Supprimer les données (même ordre qu'avant)
  DELETE FROM public.live_stream_messages 
  WHERE live_stream_id IN (SELECT id FROM public.live_streams WHERE creator_id = _creator_id);
  
  DELETE FROM public.live_stream_bans 
  WHERE live_stream_id IN (SELECT id FROM public.live_streams WHERE creator_id = _creator_id);
  
  DELETE FROM public.live_stream_settings 
  WHERE live_stream_id IN (SELECT id FROM public.live_streams WHERE creator_id = _creator_id);
  
  DELETE FROM public.live_stream_viewers 
  WHERE live_stream_id IN (SELECT id FROM public.live_streams WHERE creator_id = _creator_id);
  
  DELETE FROM public.live_stream_payments 
  WHERE live_stream_id IN (SELECT id FROM public.live_streams WHERE creator_id = _creator_id);
  
  DELETE FROM public.live_stream_revenue WHERE creator_id = _creator_id;
  
  DELETE FROM public.live_streams WHERE creator_id = _creator_id;
  
  DELETE FROM public.private_content_payments 
  WHERE message_id IN (SELECT id FROM public.private_messages WHERE creator_id = _creator_id);
  DELETE FROM public.private_messages WHERE creator_id = _creator_id;
  
  DELETE FROM public.referral_uses 
  WHERE referral_code_id IN (SELECT id FROM public.referral_codes WHERE creator_id = _creator_id);
  DELETE FROM public.referral_codes WHERE creator_id = _creator_id;
  
  DELETE FROM public.subscriptions WHERE creator_id = _creator_id;
  
  DELETE FROM public.tips WHERE creator_id = _creator_id;
  
  DELETE FROM public.content_reports 
  WHERE content_id IN (SELECT id FROM public.content WHERE creator_id = _creator_id);
  
  DELETE FROM public.content_views 
  WHERE content_id IN (SELECT id FROM public.content WHERE creator_id = _creator_id);
  
  DELETE FROM public.content_likes 
  WHERE content_id IN (SELECT id FROM public.content WHERE creator_id = _creator_id);
  
  DELETE FROM public.content WHERE creator_id = _creator_id;
  
  DELETE FROM public.platform_commissions WHERE creator_id = _creator_id;
  
  DELETE FROM public.creator_payment_requests WHERE creator_id = _creator_id;
  
  DELETE FROM public.creator_invoices WHERE creator_id = _creator_id;
  
  DELETE FROM public.follows WHERE creator_id = _creator_id;
  
  -- Supprimer les données de modération IA (preuves déjà archivées)
  DELETE FROM public.ai_moderation_queue WHERE user_id = _user_id;
  
  DELETE FROM public.creators WHERE id = _creator_id;
  
  PERFORM public.delete_user_completely(_user_id);
END;
$$;
