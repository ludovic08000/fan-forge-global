CREATE TABLE IF NOT EXISTS public.payment_audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  total_transactions integer DEFAULT 0,
  anomalies_found integer DEFAULT 0,
  anomalies jsonb DEFAULT '[]'::jsonb,
  ai_analysis text,
  score integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_audit_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit results"
  ON public.payment_audit_results FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert audit results"
  ON public.payment_audit_results FOR INSERT
  TO service_role
  WITH CHECK (true);