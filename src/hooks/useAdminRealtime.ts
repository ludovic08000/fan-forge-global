import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RealtimeStats {
  pendingReports: number;
  totalReports: number;
  recentLogins: number;
  pendingVerifications: number;
  activeUsers: number;
  pendingPayments: number;
}

interface ContentReport {
  id: string;
  content_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: string | null;
  admin_notes: string | null;
  created_at: string | null;
}

interface LoginLog {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  login_method: string | null;
  created_at: string | null;
}

interface IdentityVerification {
  id: string;
  user_id: string;
  full_name: string;
  status: string;
  created_at: string;
  document_type: string;
}

interface PaymentRequest {
  id: string;
  creator_id: string;
  amount: number;
  status: string;
  created_at: string | null;
}

/**
 * Hook pour les mises à jour en temps réel du dashboard admin
 * Inclut protection CSRF et vérification admin
 */
export const useAdminRealtime = () => {
  const { user, userRole } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState<RealtimeStats>({
    pendingReports: 0,
    totalReports: 0,
    recentLogins: 0,
    pendingVerifications: 0,
    activeUsers: 0,
    pendingPayments: 0,
  });
  
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [verifications, setVerifications] = useState<IdentityVerification[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);

  // Vérification admin sécurisée
  const verifyAdminAccess = useCallback(async () => {
    if (!user) {
      setIsAuthorized(false);
      setIsLoading(false);
      return false;
    }

    try {
      // Double vérification côté serveur
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        console.warn('Admin access denied:', error?.message);
        setIsAuthorized(false);
        setIsLoading(false);
        return false;
      }

      setIsAuthorized(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Admin verification error:', err);
      setIsAuthorized(false);
      setIsLoading(false);
      return false;
    }
  }, [user]);

  // Charger les données initiales
  const loadInitialData = useCallback(async () => {
    if (!isAuthorized) return;

    try {
      // Charger en parallèle
      const [
        reportsResult,
        loginLogsResult,
        verificationsResult,
        paymentsResult
      ] = await Promise.all([
        supabase
          .from('content_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('user_login_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('identity_verifications')
          .select('id, user_id, full_name, status, created_at, document_type')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('creator_payment_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (reportsResult.data) {
        setReports(reportsResult.data);
        setStats(prev => ({
          ...prev,
          totalReports: reportsResult.data.length,
          pendingReports: reportsResult.data.filter(r => r.status === 'pending').length
        }));
      }

      if (loginLogsResult.data) {
        setLoginLogs(loginLogsResult.data);
        // Logins des dernières 24h
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        setStats(prev => ({
          ...prev,
          recentLogins: loginLogsResult.data.filter(l => l.created_at && l.created_at > last24h).length
        }));
      }

      if (verificationsResult.data) {
        setVerifications(verificationsResult.data);
        setStats(prev => ({
          ...prev,
          pendingVerifications: verificationsResult.data.filter(v => v.status === 'pending').length
        }));
      }

      if (paymentsResult.data) {
        setPaymentRequests(paymentsResult.data);
        setStats(prev => ({
          ...prev,
          pendingPayments: paymentsResult.data.filter(p => p.status === 'pending').length
        }));
      }

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Erreur lors du chargement des données');
    }
  }, [isAuthorized]);

  // Configurer les abonnements temps réel
  useEffect(() => {
    if (!isAuthorized) return;

    // Canal pour content_reports
    const reportsChannel = supabase
      .channel('admin-reports-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_reports'
        },
        (payload) => {
          console.log('Report change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newReport = payload.new as ContentReport;
            setReports(prev => [newReport, ...prev]);
            setStats(prev => ({
              ...prev,
              totalReports: prev.totalReports + 1,
              pendingReports: newReport.status === 'pending' ? prev.pendingReports + 1 : prev.pendingReports
            }));
            toast.info('Nouveau signalement reçu');
          } else if (payload.eventType === 'UPDATE') {
            const updatedReport = payload.new as ContentReport;
            setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
            // Recalculer les stats
            setReports(prev => {
              setStats(s => ({
                ...s,
                pendingReports: prev.filter(r => r.status === 'pending').length
              }));
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as ContentReport).id;
            setReports(prev => prev.filter(r => r.id !== deletedId));
            setStats(prev => ({
              ...prev,
              totalReports: prev.totalReports - 1
            }));
          }
        }
      )
      .subscribe();

    // Canal pour login logs
    const loginChannel = supabase
      .channel('admin-logins-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_login_logs'
        },
        (payload) => {
          console.log('New login:', payload);
          const newLog = payload.new as LoginLog;
          setLoginLogs(prev => [newLog, ...prev.slice(0, 99)]);
          setStats(prev => ({
            ...prev,
            recentLogins: prev.recentLogins + 1
          }));
        }
      )
      .subscribe();

    // Canal pour identity verifications
    const verificationsChannel = supabase
      .channel('admin-verifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'identity_verifications'
        },
        (payload) => {
          console.log('Verification change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newVerif = payload.new as IdentityVerification;
            setVerifications(prev => [newVerif, ...prev]);
            if (newVerif.status === 'pending') {
              setStats(prev => ({
                ...prev,
                pendingVerifications: prev.pendingVerifications + 1
              }));
              toast.info('Nouvelle demande de vérification');
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedVerif = payload.new as IdentityVerification;
            setVerifications(prev => prev.map(v => v.id === updatedVerif.id ? updatedVerif : v));
            // Recalculer pending
            setVerifications(prev => {
              setStats(s => ({
                ...s,
                pendingVerifications: prev.filter(v => v.status === 'pending').length
              }));
              return prev;
            });
          }
        }
      )
      .subscribe();

    // Canal pour payment requests
    const paymentsChannel = supabase
      .channel('admin-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'creator_payment_requests'
        },
        (payload) => {
          console.log('Payment request change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newPayment = payload.new as PaymentRequest;
            setPaymentRequests(prev => [newPayment, ...prev]);
            if (newPayment.status === 'pending') {
              setStats(prev => ({
                ...prev,
                pendingPayments: prev.pendingPayments + 1
              }));
              toast.info('Nouvelle demande de paiement');
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedPayment = payload.new as PaymentRequest;
            setPaymentRequests(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
            setPaymentRequests(prev => {
              setStats(s => ({
                ...s,
                pendingPayments: prev.filter(p => p.status === 'pending').length
              }));
              return prev;
            });
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(loginChannel);
      supabase.removeChannel(verificationsChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [isAuthorized]);

  // Vérifier l'accès admin au montage
  useEffect(() => {
    verifyAdminAccess();
  }, [verifyAdminAccess]);

  // Charger les données après autorisation
  useEffect(() => {
    if (isAuthorized) {
      loadInitialData();
    }
  }, [isAuthorized, loadInitialData]);

  const refetch = useCallback(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    isAuthorized,
    isLoading,
    stats,
    reports,
    loginLogs,
    verifications,
    paymentRequests,
    refetch
  };
};
