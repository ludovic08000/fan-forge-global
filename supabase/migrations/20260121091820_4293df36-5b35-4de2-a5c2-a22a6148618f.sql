-- Create quarantine table for suspicious files
CREATE TABLE public.quarantine_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  scan_id TEXT,
  threat_type TEXT,
  threat_details TEXT,
  scan_result JSONB,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quarantined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'clean', 'infected', 'deleted')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quarantine_files ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage quarantine
CREATE POLICY "Admins can view quarantine files"
  ON public.quarantine_files
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage quarantine files"
  ON public.quarantine_files
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can see their own quarantined files (limited info)
CREATE POLICY "Users can view own quarantine status"
  ON public.quarantine_files
  FOR SELECT
  USING (uploader_id = auth.uid());

-- Create index for efficient queries
CREATE INDEX idx_quarantine_files_status ON public.quarantine_files(status);
CREATE INDEX idx_quarantine_files_expires_at ON public.quarantine_files(expires_at);
CREATE INDEX idx_quarantine_files_uploader ON public.quarantine_files(uploader_id);

-- Function to cleanup expired quarantine files
CREATE OR REPLACE FUNCTION public.cleanup_expired_quarantine()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE public.quarantine_files 
  SET status = 'deleted', updated_at = now()
  WHERE expires_at < now() 
  AND status = 'pending';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_quarantine_files_updated_at
  BEFORE UPDATE ON public.quarantine_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();