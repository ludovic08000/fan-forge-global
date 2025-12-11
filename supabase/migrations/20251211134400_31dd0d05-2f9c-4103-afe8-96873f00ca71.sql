-- Table pour tracker les tentatives de connexion (protection brute force)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email ou IP
  attempt_type TEXT NOT NULL DEFAULT 'login', -- login, password_reset, etc.
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_login_attempts_identifier ON public.login_attempts(identifier, created_at DESC);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address, created_at DESC);

-- Table pour les blocages temporaires
CREATE TABLE IF NOT EXISTS public.security_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'brute_force', -- brute_force, suspicious, manual
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by TEXT DEFAULT 'system',
  is_active BOOLEAN DEFAULT true,
  UNIQUE(identifier, block_type)
);

CREATE INDEX idx_security_blocks_identifier ON public.security_blocks(identifier, is_active);
CREATE INDEX idx_security_blocks_expires ON public.security_blocks(expires_at) WHERE is_active = true;

-- Fonction pour vérifier si un identifiant est bloqué
CREATE OR REPLACE FUNCTION public.is_blocked(check_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.security_blocks
    WHERE identifier = check_identifier
    AND is_active = true
    AND expires_at > now()
  )
$$;

-- Fonction pour compter les tentatives échouées récentes
CREATE OR REPLACE FUNCTION public.count_failed_attempts(
  check_identifier TEXT,
  time_window INTERVAL DEFAULT '15 minutes'::INTERVAL
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.login_attempts
  WHERE (identifier = check_identifier OR ip_address = check_identifier)
  AND success = false
  AND created_at > now() - time_window
$$;

-- Fonction pour bloquer automatiquement après trop de tentatives
CREATE OR REPLACE FUNCTION public.auto_block_if_needed(
  check_identifier TEXT,
  check_ip TEXT DEFAULT NULL,
  max_attempts INTEGER DEFAULT 5,
  block_duration INTERVAL DEFAULT '30 minutes'::INTERVAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Compter les tentatives pour l'identifiant
  SELECT COUNT(*) INTO attempt_count
  FROM public.login_attempts
  WHERE (identifier = check_identifier OR (check_ip IS NOT NULL AND ip_address = check_ip))
  AND success = false
  AND created_at > now() - '15 minutes'::INTERVAL;

  -- Si trop de tentatives, bloquer
  IF attempt_count >= max_attempts THEN
    INSERT INTO public.security_blocks (identifier, block_type, reason, expires_at)
    VALUES (
      check_identifier,
      'brute_force',
      'Trop de tentatives de connexion échouées (' || attempt_count || ')',
      now() + block_duration
    )
    ON CONFLICT (identifier, block_type) 
    DO UPDATE SET 
      expires_at = now() + block_duration,
      is_active = true,
      blocked_at = now();
    
    -- Bloquer aussi l'IP si fournie
    IF check_ip IS NOT NULL THEN
      INSERT INTO public.security_blocks (identifier, block_type, reason, expires_at)
      VALUES (
        check_ip,
        'brute_force',
        'IP bloquée suite à tentatives multiples',
        now() + block_duration
      )
      ON CONFLICT (identifier, block_type) 
      DO UPDATE SET 
        expires_at = now() + block_duration,
        is_active = true,
        blocked_at = now();
    END IF;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Nettoyer les anciennes entrées
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.login_attempts WHERE created_at < now() - '7 days'::INTERVAL;
  UPDATE public.security_blocks SET is_active = false WHERE expires_at < now();
$$;

-- RLS pour login_attempts (pas de lecture publique)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent voir les tentatives
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS pour security_blocks
ALTER TABLE public.security_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security blocks"
ON public.security_blocks
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Vérifier les RLS sur private_messages
DROP POLICY IF EXISTS "Creators and subscribers can view their messages" ON public.private_messages;
DROP POLICY IF EXISTS "Creators and subscribers can insert messages" ON public.private_messages;

CREATE POLICY "Only participants can view messages"
ON public.private_messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.creators WHERE id = creator_id
  )
  OR auth.uid() = subscriber_id
);

CREATE POLICY "Only participants can insert messages"
ON public.private_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.creators WHERE id = creator_id
  )
  OR auth.uid() = subscriber_id
);

CREATE POLICY "Only participants can update messages"
ON public.private_messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.creators WHERE id = creator_id
  )
  OR auth.uid() = subscriber_id
);

-- Protéger les paiements de contenu privé
DROP POLICY IF EXISTS "Users can view their own payments" ON public.private_content_payments;

CREATE POLICY "Only payer can view their payments"
ON public.private_content_payments
FOR SELECT
TO authenticated
USING (auth.uid() = subscriber_id);

-- Protéger les viewers de live (seuls les participants peuvent voir)
DROP POLICY IF EXISTS "Live stream viewers policy" ON public.live_stream_viewers;

CREATE POLICY "Only stream creator and admins can view viewers"
ON public.live_stream_viewers
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.live_streams ls
    JOIN public.creators c ON c.id = ls.creator_id
    WHERE ls.id = live_stream_id AND c.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Protéger les messages de live
DROP POLICY IF EXISTS "Live messages visible to participants" ON public.live_stream_messages;

CREATE POLICY "Live messages visible to stream participants"
ON public.live_stream_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id = live_stream_id
    AND (
      ls.is_premium = false
      OR public.has_live_access(auth.uid(), ls.id)
      OR EXISTS (
        SELECT 1 FROM public.creators c 
        WHERE c.id = ls.creator_id AND c.user_id = auth.uid()
      )
    )
  )
);