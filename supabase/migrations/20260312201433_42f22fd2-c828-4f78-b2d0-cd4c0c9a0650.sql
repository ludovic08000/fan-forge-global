-- Table pour stocker les métriques de performance
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  page_url text NOT NULL,
  user_agent text,
  device_type text, -- mobile, tablet, desktop
  -- Web Vitals
  lcp numeric, -- Largest Contentful Paint (ms)
  fid numeric, -- First Input Delay (ms)
  cls numeric, -- Cumulative Layout Shift
  fcp numeric, -- First Contentful Paint (ms)
  ttfb numeric, -- Time to First Byte (ms)
  inp numeric, -- Interaction to Next Paint (ms)
  -- Custom metrics
  dom_nodes integer,
  js_heap_size numeric,
  resource_count integer,
  total_transfer_size numeric,
  -- AI analysis
  ai_score integer, -- 0-100
  ai_recommendations jsonb,
  ai_analyzed_at timestamptz,
  -- Meta
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for querying recent metrics
CREATE INDEX IF NOT EXISTS idx_perf_metrics_created ON performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_page ON performance_metrics(page_url);

-- RLS: anyone can insert (anonymous metrics), only admins can read
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert performance metrics"
  ON performance_metrics FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read performance metrics"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-cleanup old metrics (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_performance_metrics()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM performance_metrics WHERE created_at < now() - interval '30 days';
$$;