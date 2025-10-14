import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BanData {
  userId: string;
  reason?: string;
  duration?: number; // minutes, undefined = permanent
}

interface LiveStreamSettings {
  slow_mode_enabled: boolean;
  slow_mode_interval: number;
  subscribers_only: boolean;
}

export const useLiveModeration = (liveStreamId: string) => {
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<LiveStreamSettings>({
    slow_mode_enabled: false,
    slow_mode_interval: 5,
    subscribers_only: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!liveStreamId) return;

    fetchBannedUsers();
    fetchSettings();
  }, [liveStreamId]);

  const fetchBannedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('live_stream_bans')
        .select('user_id, expires_at')
        .eq('live_stream_id', liveStreamId);

      if (error) throw error;

      const activeBans = new Set(
        data
          ?.filter((ban) => {
            if (!ban.expires_at) return true;
            return new Date(ban.expires_at) > new Date();
          })
          .map((ban) => ban.user_id) || []
      );

      setBannedUsers(activeBans);
    } catch (error) {
      console.error('Error fetching banned users:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('live_stream_settings')
        .select('*')
        .eq('live_stream_id', liveStreamId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          slow_mode_enabled: data.slow_mode_enabled,
          slow_mode_interval: data.slow_mode_interval,
          subscribers_only: data.subscribers_only,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const banUser = async ({ userId, reason, duration }: BanData) => {
    try {
      const expiresAt = duration
        ? new Date(Date.now() + duration * 60000).toISOString()
        : null;

      const { error } = await supabase.from('live_stream_bans').insert({
        live_stream_id: liveStreamId,
        user_id: userId,
        banned_by: (await supabase.auth.getUser()).data.user?.id,
        reason,
        expires_at: expiresAt,
      });

      if (error) throw error;

      setBannedUsers((prev) => new Set(prev).add(userId));
      toast.success('Utilisateur banni du live');
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Erreur lors du bannissement');
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('live_stream_bans')
        .delete()
        .eq('live_stream_id', liveStreamId)
        .eq('user_id', userId);

      if (error) throw error;

      setBannedUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      toast.success('Utilisateur débanni');
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Erreur lors du débannissement');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('live_stream_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast.success('Message supprimé');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const updateSettings = async (newSettings: Partial<LiveStreamSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };

      const { error } = await supabase.from('live_stream_settings').upsert({
        live_stream_id: liveStreamId,
        ...updatedSettings,
      });

      if (error) throw error;

      setSettings(updatedSettings);
      toast.success('Paramètres mis à jour');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const isUserBanned = (userId: string) => bannedUsers.has(userId);

  return {
    bannedUsers,
    settings,
    loading,
    banUser,
    unbanUser,
    deleteMessage,
    updateSettings,
    isUserBanned,
  };
};
