import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LiveAnalytics {
  totalRevenue: number;
  totalViewers: number;
  peakViewers: number;
  averageViewTime: number;
  totalMessages: number;
  revenueByMinute: Array<{ minute: number; revenue: number; viewers: number }>;
  viewersByTime: Array<{ time: string; count: number }>;
}

export const useLiveAnalytics = (liveStreamId: string) => {
  const [analytics, setAnalytics] = useState<LiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!liveStreamId) return;

    fetchAnalytics();

    // Rafraîchir toutes les 30 secondes pendant le live
    const interval = setInterval(fetchAnalytics, 30000);

    return () => clearInterval(interval);
  }, [liveStreamId]);

  const fetchAnalytics = async () => {
    try {
      // Récupérer les données du stream
      const { data: stream, error: streamError } = await supabase
        .from('live_streams')
        .select('*')
        .eq('id', liveStreamId)
        .single();

      if (streamError) throw streamError;

      // Récupérer les revenus par minute
      const { data: revenue, error: revenueError } = await supabase
        .from('live_stream_revenue')
        .select('*')
        .eq('live_stream_id', liveStreamId)
        .order('minute_number', { ascending: true });

      if (revenueError) throw revenueError;

      // Récupérer l'historique des viewers
      const { data: viewers, error: viewersError } = await supabase
        .from('live_stream_viewers')
        .select('joined_at, left_at')
        .eq('live_stream_id', liveStreamId);

      if (viewersError) throw viewersError;

      // Récupérer les messages
      const { data: messages, error: messagesError } = await supabase
        .from('live_stream_messages')
        .select('id')
        .eq('live_stream_id', liveStreamId);

      if (messagesError) throw messagesError;

      // Calculer les métriques
      const totalRevenue = revenue?.reduce((sum, r) => sum + Number(r.revenue_amount), 0) || 0;
      const peakViewers = Math.max(...(revenue?.map(r => r.viewer_count) || [0]));
      
      // Calculer le temps moyen de visionnage
      const viewTimes = viewers?.map(v => {
        const joinedAt = new Date(v.joined_at).getTime();
        const leftAt = v.left_at ? new Date(v.left_at).getTime() : Date.now();
        return (leftAt - joinedAt) / 1000 / 60; // en minutes
      }) || [];
      const averageViewTime = viewTimes.length > 0
        ? viewTimes.reduce((sum, time) => sum + time, 0) / viewTimes.length
        : 0;

      // Préparer les données pour les graphiques
      const revenueByMinute = revenue?.map(r => ({
        minute: r.minute_number,
        revenue: Number(r.revenue_amount),
        viewers: r.viewer_count,
      })) || [];

      // Grouper les viewers par tranche de 5 minutes
      const viewersByTime = calculateViewersByTime(viewers || [], stream?.started_at);

      setAnalytics({
        totalRevenue,
        totalViewers: viewers?.length || 0,
        peakViewers,
        averageViewTime,
        totalMessages: messages?.length || 0,
        revenueByMinute,
        viewersByTime,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateViewersByTime = (viewers: any[], startedAt?: string) => {
    if (!startedAt || viewers.length === 0) return [];

    const startTime = new Date(startedAt).getTime();
    const now = Date.now();
    const duration = (now - startTime) / 1000 / 60; // en minutes
    const intervals = Math.ceil(duration / 5); // Intervalles de 5 minutes

    const result = [];
    for (let i = 0; i < intervals; i++) {
      const intervalStart = startTime + (i * 5 * 60 * 1000);
      const intervalEnd = intervalStart + (5 * 60 * 1000);

      const count = viewers.filter(v => {
        const joined = new Date(v.joined_at).getTime();
        const left = v.left_at ? new Date(v.left_at).getTime() : now;
        return joined < intervalEnd && left > intervalStart;
      }).length;

      result.push({
        time: new Date(intervalStart).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        count,
      });
    }

    return result;
  };

  return {
    analytics,
    loading,
    refetch: fetchAnalytics,
  };
};
