
-- Mettre à jour la fonction d'archivage pour inclure les IP et logs de connexion
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
  _ip_addresses jsonb;
  _login_timestamps jsonb;
BEGIN
  -- Récupérer l'email
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Récupérer le stage_name si créateur
  IF _creator_id IS NOT NULL THEN
    SELECT stage_name INTO _stage_name FROM public.creators WHERE id = _creator_id;
  END IF;
  
  -- Récupérer toutes les adresses IP utilisées (depuis login_attempts)
  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'ip', la.ip_address,
    'user_agent', la.user_agent,
    'last_seen', la.created_at,
    'success', la.success
  )), '[]'::jsonb)
  INTO _ip_addresses
  FROM public.login_attempts la
  WHERE la.identifier = _user_email
     OR la.ip_address IN (
       SELECT DISTINCT la2.ip_address 
       FROM public.login_attempts la2 
       WHERE la2.identifier = _user_email AND la2.ip_address IS NOT NULL
     );
  
  -- Récupérer les timestamps de connexion réussis
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'timestamp', la.created_at,
    'ip', la.ip_address,
    'user_agent', la.user_agent
  ) ORDER BY la.created_at DESC), '[]'::jsonb)
  INTO _login_timestamps
  FROM public.login_attempts la
  WHERE la.identifier = _user_email
    AND la.success = true;
  
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
      user_ip_addresses,
      login_timestamps,
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
      _ip_addresses,
      _login_timestamps,
      _stage_name,
      COALESCE(_moderation_record.ai_category, 'unknown'),
      _moderation_record.ai_reason,
      _moderation_record.ai_confidence,
      _moderation_record.ai_category,
      _moderation_record.content_id,
      _moderation_record.file_url,
      ARRAY[_moderation_record.file_url],
      -- Les fichiers seront copiés dans legal-archives/ par la edge function
      ARRAY['legal-archives/' || _user_id::text || '/' || _moderation_record.file_url],
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
