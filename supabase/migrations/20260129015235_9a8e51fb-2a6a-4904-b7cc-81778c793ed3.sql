-- Recréer les vues avec security_invoker = true pour respecter les RLS
DROP VIEW IF EXISTS public.admin_niche_analytics;
DROP VIEW IF EXISTS public.admin_creator_revenue;
DROP VIEW IF EXISTS public.admin_subscription_retention;
DROP VIEW IF EXISTS public.admin_platform_arpu;

-- Vue pour les analytics par niche (catégorie)
CREATE VIEW public.admin_niche_analytics 
WITH (security_invoker = true) AS
SELECT 
  c.category AS niche,
  COUNT(DISTINCT c.id) AS total_creators,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') AS active_subscriptions,
  COUNT(DISTINCT s.subscriber_id) FILTER (WHERE s.status = 'active') AS unique_subscribers,
  COALESCE(SUM(s.price) FILTER (WHERE s.status = 'active'), 0) AS total_revenue,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT c.id) > 0 
      THEN (COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active')::NUMERIC / COUNT(DISTINCT c.id)) * 100
      ELSE 0 
    END, 2
  ) AS conversion_rate,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT s.subscriber_id) FILTER (WHERE s.status = 'active') > 0 
      THEN COALESCE(SUM(s.price) FILTER (WHERE s.status = 'active'), 0) / COUNT(DISTINCT s.subscriber_id) FILTER (WHERE s.status = 'active')
      ELSE 0 
    END, 2
  ) AS arpu
FROM public.creators c
LEFT JOIN public.subscriptions s ON s.creator_id = c.id
WHERE c.category IS NOT NULL
GROUP BY c.category
ORDER BY total_revenue DESC;

-- Vue pour les revenus par créateur (top performers)
CREATE VIEW public.admin_creator_revenue 
WITH (security_invoker = true) AS
SELECT 
  c.id AS creator_id,
  c.user_id,
  c.stage_name,
  c.category,
  c.total_subscribers,
  c.total_content,
  c.currency,
  COALESCE(sub_rev.subscription_revenue, 0) AS subscription_revenue,
  COALESCE(tip_rev.tips_revenue, 0) AS tips_revenue,
  COALESCE(live_rev.live_revenue, 0) AS live_revenue,
  COALESCE(pc_rev.private_content_revenue, 0) AS private_content_revenue,
  COALESCE(sub_rev.subscription_revenue, 0) + COALESCE(tip_rev.tips_revenue, 0) + 
    COALESCE(live_rev.live_revenue, 0) + COALESCE(pc_rev.private_content_revenue, 0) AS total_revenue,
  c.created_at
FROM public.creators c
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(price), 0) AS subscription_revenue
  FROM public.subscriptions
  WHERE creator_id = c.id AND status = 'active'
) sub_rev ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount), 0) AS tips_revenue
  FROM public.tips
  WHERE creator_id = c.id AND stripe_payment_intent_id IS NOT NULL
) tip_rev ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(revenue_amount), 0) AS live_revenue
  FROM public.live_stream_revenue
  WHERE creator_id = c.id
) live_rev ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(pcp.amount), 0) AS private_content_revenue
  FROM public.private_content_payments pcp
  JOIN public.private_messages pm ON pm.id = pcp.message_id
  WHERE pm.creator_id = c.id AND pcp.status = 'paid'
) pc_rev ON true
ORDER BY total_revenue DESC;

-- Vue pour la rétention des abonnés
CREATE VIEW public.admin_subscription_retention 
WITH (security_invoker = true) AS
WITH subscription_cohorts AS (
  SELECT 
    date_trunc('month', created_at) AS cohort_month,
    subscriber_id,
    creator_id,
    status,
    created_at,
    end_date,
    CASE 
      WHEN status = 'active' AND (end_date IS NULL OR end_date > NOW()) THEN true
      ELSE false
    END AS is_retained
  FROM public.subscriptions
),
monthly_stats AS (
  SELECT 
    cohort_month,
    COUNT(DISTINCT subscriber_id) AS total_subscribers,
    COUNT(DISTINCT subscriber_id) FILTER (WHERE is_retained = true) AS retained_subscribers,
    COUNT(DISTINCT subscriber_id) FILTER (WHERE is_retained = false) AS churned_subscribers
  FROM subscription_cohorts
  GROUP BY cohort_month
)
SELECT 
  cohort_month,
  total_subscribers,
  retained_subscribers,
  churned_subscribers,
  ROUND(
    CASE 
      WHEN total_subscribers > 0 
      THEN (retained_subscribers::NUMERIC / total_subscribers) * 100
      ELSE 0 
    END, 2
  ) AS retention_rate,
  ROUND(
    CASE 
      WHEN total_subscribers > 0 
      THEN (churned_subscribers::NUMERIC / total_subscribers) * 100
      ELSE 0 
    END, 2
  ) AS churn_rate
FROM monthly_stats
WHERE cohort_month >= NOW() - INTERVAL '12 months'
ORDER BY cohort_month DESC;

-- Vue pour les métriques ARPU globales
CREATE VIEW public.admin_platform_arpu 
WITH (security_invoker = true) AS
WITH revenue_data AS (
  SELECT 
    date_trunc('month', created_at) AS month,
    'subscription' AS revenue_type,
    subscriber_id AS user_id,
    price AS amount
  FROM public.subscriptions
  WHERE status = 'active'
  UNION ALL
  SELECT 
    date_trunc('month', created_at) AS month,
    'tip' AS revenue_type,
    sender_id AS user_id,
    amount
  FROM public.tips
  WHERE stripe_payment_intent_id IS NOT NULL
  UNION ALL
  SELECT 
    date_trunc('month', pcp.created_at) AS month,
    'private_content' AS revenue_type,
    pcp.subscriber_id AS user_id,
    pcp.amount
  FROM public.private_content_payments pcp
  WHERE pcp.status = 'paid'
  UNION ALL
  SELECT 
    date_trunc('month', lsp.created_at) AS month,
    'live_access' AS revenue_type,
    lsp.subscriber_id AS user_id,
    lsp.amount
  FROM public.live_stream_payments lsp
  WHERE lsp.status = 'paid'
)
SELECT 
  month,
  COUNT(DISTINCT user_id) AS paying_users,
  SUM(amount) AS total_revenue,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT user_id) > 0 
      THEN SUM(amount) / COUNT(DISTINCT user_id)
      ELSE 0 
    END, 2
  ) AS arpu,
  SUM(amount) FILTER (WHERE revenue_type = 'subscription') AS subscription_revenue,
  SUM(amount) FILTER (WHERE revenue_type = 'tip') AS tips_revenue,
  SUM(amount) FILTER (WHERE revenue_type = 'private_content') AS private_content_revenue,
  SUM(amount) FILTER (WHERE revenue_type = 'live_access') AS live_revenue
FROM revenue_data
WHERE month >= NOW() - INTERVAL '12 months'
GROUP BY month
ORDER BY month DESC;

COMMENT ON VIEW public.admin_niche_analytics IS 'Analytics par catégorie/niche pour le dashboard admin - security_invoker';
COMMENT ON VIEW public.admin_creator_revenue IS 'Revenus détaillés par créateur - security_invoker';
COMMENT ON VIEW public.admin_subscription_retention IS 'Métriques de rétention par cohorte - security_invoker';
COMMENT ON VIEW public.admin_platform_arpu IS 'ARPU mensuel de la plateforme - security_invoker';