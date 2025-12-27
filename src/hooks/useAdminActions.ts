import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook pour les actions admin sécurisées
 * Inclut rate limiting et logging
 */
export const useAdminActions = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<number>(0);

  // Rate limiting côté client (5 secondes entre chaque action)
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    if (now - lastAction < 5000) {
      toast.warning('Veuillez patienter avant d\'effectuer une nouvelle action');
      return false;
    }
    setLastAction(now);
    return true;
  }, [lastAction]);

  // Vérifier le rôle admin avant toute action
  const verifyAdminRole = useCallback(async () => {
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (error || !data) {
      toast.error('Action non autorisée');
      return false;
    }

    return true;
  }, [user]);

  // Mettre à jour le statut d'un signalement
  const updateReportStatus = useCallback(async (
    reportId: string,
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
    adminNotes?: string
  ) => {
    if (!checkRateLimit() || !await verifyAdminRole()) return false;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Signalement mis à jour');
      return true;
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [user, checkRateLimit, verifyAdminRole]);

  // Approuver une vérification d'identité
  const approveVerification = useCallback(async (verificationId: string, userId: string) => {
    if (!checkRateLimit() || !await verifyAdminRole()) return false;

    setIsProcessing(true);
    try {
      // Mettre à jour la vérification
      const { error: verifError } = await supabase
        .from('identity_verifications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', verificationId);

      if (verifError) throw verifError;

      // Marquer le profil comme vérifié
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_identity_verified: true })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast.success('Vérification approuvée');
      return true;
    } catch (error) {
      console.error('Error approving verification:', error);
      toast.error('Erreur lors de l\'approbation');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [user, checkRateLimit, verifyAdminRole]);

  // Rejeter une vérification d'identité
  const rejectVerification = useCallback(async (
    verificationId: string,
    reason: string
  ) => {
    if (!checkRateLimit() || !await verifyAdminRole()) return false;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('identity_verifications')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', verificationId);

      if (error) throw error;

      toast.success('Vérification rejetée');
      return true;
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast.error('Erreur lors du rejet');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [user, checkRateLimit, verifyAdminRole]);

  // Suspendre un utilisateur
  const suspendUser = useCallback(async (
    targetUserId: string,
    reason: string,
    leakId?: string
  ) => {
    if (!checkRateLimit() || !await verifyAdminRole()) return false;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_suspensions')
        .insert({
          user_id: targetUserId,
          reason,
          suspended_by: user?.id,
          leak_id: leakId,
          is_active: true
        });

      if (error) throw error;

      toast.success('Utilisateur suspendu');
      return true;
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Erreur lors de la suspension');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [user, checkRateLimit, verifyAdminRole]);

  // Lever une suspension
  const liftSuspension = useCallback(async (suspensionId: string) => {
    if (!checkRateLimit() || !await verifyAdminRole()) return false;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_suspensions')
        .update({
          is_active: false,
          lifted_at: new Date().toISOString(),
          lifted_by: user?.id
        })
        .eq('id', suspensionId);

      if (error) throw error;

      toast.success('Suspension levée');
      return true;
    } catch (error) {
      console.error('Error lifting suspension:', error);
      toast.error('Erreur lors de la levée de suspension');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [user, checkRateLimit, verifyAdminRole]);

  // Traiter une demande de paiement
  const processPaymentRequest = useCallback(async (
    requestId: string,
    action: 'approve' | 'reject',
    errorMessage?: string
  ) => {
    if (!checkRateLimit() || !await verifyAdminRole()) return false;

    setIsProcessing(true);
    try {
      const updateData: Record<string, unknown> = {
        status: action === 'approve' ? 'processing' : 'rejected',
        updated_at: new Date().toISOString()
      };

      if (action === 'reject' && errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error } = await supabase
        .from('creator_payment_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast.success(action === 'approve' ? 'Paiement en cours de traitement' : 'Demande rejetée');
      return true;
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Erreur lors du traitement');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [user, checkRateLimit, verifyAdminRole]);

  return {
    isProcessing,
    updateReportStatus,
    approveVerification,
    rejectVerification,
    suspendUser,
    liftSuspension,
    processPaymentRequest
  };
};
