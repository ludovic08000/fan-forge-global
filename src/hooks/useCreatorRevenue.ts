import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RevenueRange = '24h' | '7d' | '30d' | '90d' | '1y';

export interface RevenuePoint {
  date: Date;
  label: string;
  subscriptions: number;
  tips: number;
  live: number;
  privateContent: number;
  total: number;
}

const RANGE_CONFIG: Record<RevenueRange, { ms: number; bucket: 'hour' | 'day' | 'month'; label: string }> = {
  '24h': { ms: 24 * 3600 * 1000, bucket: 'hour', label: '24 h' },
  '7d': { ms: 7 * 24 * 3600 * 1000, bucket: 'day', label: '7 jours' },
  '30d': { ms: 30 * 24 * 3600 * 1000, bucket: 'day', label: '30 jours' },
  '90d': { ms: 90 * 24 * 3600 * 1000, bucket: 'day', label: '90 jours' },
  '1y': { ms: 365 * 24 * 3600 * 1000, bucket: 'month', label: 'Année' },
};

export const REVENUE_RANGES = (Object.keys(RANGE_CONFIG) as RevenueRange[]).map((id) => ({
  id,
  label: RANGE_CONFIG[id].label,
}));

const formatLabel = (d: Date, bucket: 'hour' | 'day' | 'month') => {
  if (bucket === 'hour') return d.toLocaleTimeString('fr-FR', { hour: '2-digit' }) + 'h';
  if (bucket === 'month') return d.toLocaleDateString('fr-FR', { month: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

/**
 * Série temporelle des revenus réels du créateur.
 * Source unique de vérité: RPC get_creator_revenue_timeseries, qui applique
 * exactement la même logique de commission que calculate_creator_revenue_with_commission.
 */
export function useCreatorRevenueSeries(creatorId: string | undefined, range: RevenueRange) {
  const { ms, bucket } = RANGE_CONFIG[range];

  const { start, end } = useMemo(() => {
    const now = new Date();
    return { start: new Date(now.getTime() - ms), end: now };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, creatorId, range]);

  const query = useQuery({
    queryKey: ['creator-revenue-series', creatorId, range],
    enabled: !!creatorId,
    staleTime: 60_000,
    queryFn: async (): Promise<RevenuePoint[]> => {
      const { data, error } = await supabase.rpc('get_creator_revenue_timeseries', {
        creator_uuid: creatorId as string,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_bucket: bucket,
      });
      if (error) throw error;
      return (data || []).map((row: any) => {
        const date = new Date(row.bucket_start);
        return {
          date,
          label: formatLabel(date, bucket),
          subscriptions: Number(row.subscription_revenue) || 0,
          tips: Number(row.tips_revenue) || 0,
          live: Number(row.live_revenue) || 0,
          privateContent: Number(row.private_content_revenue) || 0,
          total: Number(row.total_after_commission) || 0,
        };
      });
    },
  });

  const points = query.data ?? [];

  const totals = useMemo(() => {
    return points.reduce(
      (acc, p) => ({
        subscriptions: acc.subscriptions + p.subscriptions,
        tips: acc.tips + p.tips,
        live: acc.live + p.live,
        privateContent: acc.privateContent + p.privateContent,
        total: acc.total + p.total,
      }),
      { subscriptions: 0, tips: 0, live: 0, privateContent: 0, total: 0 }
    );
  }, [points]);

  return { points, totals, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

export const formatEuro = (value: number, compact = false) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : value % 1 === 0 ? 0 : 2,
  }).format(value || 0);