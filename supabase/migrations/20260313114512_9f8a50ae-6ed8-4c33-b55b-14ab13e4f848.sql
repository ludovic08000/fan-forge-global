
-- Enable pgmq extension
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create the email queue
SELECT pgmq.create('email_queue');

-- Create enqueue_email RPC wrapper
CREATE OR REPLACE FUNCTION public.enqueue_email(
  payload jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg_id bigint;
BEGIN
  SELECT pgmq.send('email_queue', payload) INTO msg_id;
  RETURN msg_id;
END;
$$;

-- Create dequeue_email RPC wrapper
CREATE OR REPLACE FUNCTION public.dequeue_email(batch_size int DEFAULT 10)
RETURNS SETOF pgmq.message_record
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM pgmq.read('email_queue', 30, batch_size);
END;
$$;

-- Create delete_email_message to archive processed messages
CREATE OR REPLACE FUNCTION public.delete_email_message(msg_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.delete('email_queue', msg_id);
END;
$$;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION public.enqueue_email(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.dequeue_email(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email_message(bigint) TO service_role;
