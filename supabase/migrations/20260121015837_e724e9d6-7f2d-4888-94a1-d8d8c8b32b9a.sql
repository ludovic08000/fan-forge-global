-- Table pour stocker les fingerprints média et le journal de preuve
CREATE TABLE public.media_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.private_messages(id) ON DELETE CASCADE,
  
  -- User tracking
  uploader_id UUID NOT NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  
  -- Fingerprints
  phash TEXT, -- Perceptual hash (image)
  sha256_hash TEXT NOT NULL, -- Cryptographic hash for integrity
  video_fingerprint TEXT, -- Basic video fingerprint (frame samples)
  
  -- Watermark tracking
  watermark_id TEXT, -- Unique watermark identifier
  watermark_pattern TEXT, -- Encoded pattern for tracing
  
  -- File metadata
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image' or 'video'
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  duration NUMERIC, -- For videos, in seconds
  
  -- Proof data
  original_filename TEXT,
  mime_type TEXT,
  upload_ip TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ, -- When fingerprint was verified
  
  -- Constraints
  CONSTRAINT at_least_one_reference CHECK (content_id IS NOT NULL OR message_id IS NOT NULL)
);

-- Index for fast duplicate detection
CREATE INDEX idx_media_fingerprints_phash ON public.media_fingerprints(phash) WHERE phash IS NOT NULL;
CREATE INDEX idx_media_fingerprints_sha256 ON public.media_fingerprints(sha256_hash);
CREATE INDEX idx_media_fingerprints_video ON public.media_fingerprints(video_fingerprint) WHERE video_fingerprint IS NOT NULL;
CREATE INDEX idx_media_fingerprints_watermark ON public.media_fingerprints(watermark_id) WHERE watermark_id IS NOT NULL;
CREATE INDEX idx_media_fingerprints_uploader ON public.media_fingerprints(uploader_id);
CREATE INDEX idx_media_fingerprints_creator ON public.media_fingerprints(creator_id);
CREATE INDEX idx_media_fingerprints_created ON public.media_fingerprints(created_at);

-- Table pour journaliser les détections de duplicata
CREATE TABLE public.duplicate_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_fingerprint_id UUID NOT NULL REFERENCES public.media_fingerprints(id) ON DELETE CASCADE,
  duplicate_fingerprint_id UUID REFERENCES public.media_fingerprints(id) ON DELETE SET NULL,
  
  detection_type TEXT NOT NULL, -- 'exact', 'perceptual', 'video_match'
  similarity_score NUMERIC, -- 0-1, how similar
  
  -- Source of detection
  detected_url TEXT, -- URL where duplicate was found (external)
  detected_platform TEXT, -- Platform name if external
  
  -- Action tracking
  action_taken TEXT, -- 'none', 'takedown_requested', 'legal_notice', 'banned'
  action_taken_at TIMESTAMPTZ,
  action_taken_by UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_duplicate_detections_original ON public.duplicate_detections(original_fingerprint_id);
CREATE INDEX idx_duplicate_detections_type ON public.duplicate_detections(detection_type);

-- Enable RLS
ALTER TABLE public.media_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_detections ENABLE ROW LEVEL SECURITY;

-- Policies for media_fingerprints
CREATE POLICY "Users can view their own fingerprints"
  ON public.media_fingerprints FOR SELECT
  USING (uploader_id = auth.uid());

CREATE POLICY "Creators can view fingerprints of their content"
  ON public.media_fingerprints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creators c
      WHERE c.id = media_fingerprints.creator_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all fingerprints"
  ON public.media_fingerprints FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert fingerprints"
  ON public.media_fingerprints FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for duplicate_detections
CREATE POLICY "Creators can view duplicates of their content"
  ON public.duplicate_detections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.media_fingerprints mf
      JOIN public.creators c ON mf.creator_id = c.id
      WHERE mf.id = duplicate_detections.original_fingerprint_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage duplicate detections"
  ON public.duplicate_detections FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to find similar images by pHash (Hamming distance)
CREATE OR REPLACE FUNCTION public.find_similar_images(
  p_phash TEXT,
  p_max_distance INTEGER DEFAULT 10
)
RETURNS TABLE (
  fingerprint_id UUID,
  content_id UUID,
  uploader_id UUID,
  creator_id UUID,
  phash TEXT,
  distance INTEGER,
  file_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mf.id AS fingerprint_id,
    mf.content_id,
    mf.uploader_id,
    mf.creator_id,
    mf.phash,
    -- Calculate Hamming distance between hex strings
    (
      SELECT COUNT(*)::INTEGER
      FROM (
        SELECT unnest(regexp_split_to_array(p_phash, '')) AS c1,
               unnest(regexp_split_to_array(mf.phash, '')) AS c2
      ) chars
      WHERE c1 != c2
    ) AS distance,
    mf.file_url,
    mf.created_at
  FROM public.media_fingerprints mf
  WHERE mf.phash IS NOT NULL
    AND mf.phash != p_phash
    AND LENGTH(mf.phash) = LENGTH(p_phash)
  ORDER BY distance ASC
  LIMIT 20;
END;
$$;

-- Function to check for exact duplicates
CREATE OR REPLACE FUNCTION public.check_duplicate_hash(
  p_sha256_hash TEXT
)
RETURNS TABLE (
  fingerprint_id UUID,
  content_id UUID,
  uploader_id UUID,
  file_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id AS fingerprint_id,
    content_id,
    uploader_id,
    file_url,
    created_at
  FROM public.media_fingerprints
  WHERE sha256_hash = p_sha256_hash
  LIMIT 1;
$$;