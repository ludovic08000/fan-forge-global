-- Tables used by transactional email edge functions.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'pending',
      'sent',
      'failed',
      'suppressed',
      'bounced',
      'complained'
    )
  ),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_message_id
  ON public.email_send_log(message_id);

CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient_created
  ON public.email_send_log(recipient_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_send_log_status_created
  ON public.email_send_log(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_email
  ON public.email_unsubscribe_tokens(email);

CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_send_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_unsubscribe_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppressed_emails TO service_role;

-- Compatibility overload for deployed edge functions that still pass queue_name.
-- All current email payloads are dispatched through the single pgmq queue.
CREATE OR REPLACE FUNCTION public.enqueue_email(
  queue_name TEXT,
  payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg_id BIGINT;
BEGIN
  IF queue_name NOT IN ('email_queue', 'transactional_emails', 'auth_emails') THEN
    RAISE EXCEPTION 'Unsupported email queue name: %', queue_name;
  END IF;

  SELECT pgmq.send('email_queue', payload) INTO msg_id;
  RETURN msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;
