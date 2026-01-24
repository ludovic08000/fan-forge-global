import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CURRENT_TERMS_VERSION = '1.0';
const CURRENT_PRIVACY_VERSION = '1.0';

interface TermsStatus {
  needsAcceptance: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  termsVersion: string | null;
  privacyVersion: string | null;
  isLoading: boolean;
}

export const useTermsAcceptance = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<TermsStatus>({
    needsAcceptance: false,
    termsAccepted: false,
    privacyAccepted: false,
    termsVersion: null,
    privacyVersion: null,
    isLoading: true
  });

  useEffect(() => {
    checkTermsStatus();
  }, [user]);

  const checkTermsStatus = async () => {
    if (!user) {
      setStatus(prev => ({ ...prev, isLoading: false, needsAcceptance: false }));
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('terms_accepted_at, privacy_accepted_at, terms_version, privacy_version')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const termsAccepted = !!profile?.terms_accepted_at && profile?.terms_version === CURRENT_TERMS_VERSION;
      const privacyAccepted = !!profile?.privacy_accepted_at && profile?.privacy_version === CURRENT_PRIVACY_VERSION;
      
      // L'utilisateur doit accepter si l'une des conditions n'est pas remplie
      // ou si les versions ont changé
      const needsAcceptance = !termsAccepted || !privacyAccepted;

      setStatus({
        needsAcceptance,
        termsAccepted,
        privacyAccepted,
        termsVersion: profile?.terms_version || null,
        privacyVersion: profile?.privacy_version || null,
        isLoading: false
      });
    } catch (error) {
      console.error('Erreur vérification CGU:', error);
      setStatus(prev => ({ 
        ...prev, 
        isLoading: false,
        needsAcceptance: true // En cas d'erreur, demander l'acceptation
      }));
    }
  };

  const refreshStatus = () => {
    checkTermsStatus();
  };

  return {
    ...status,
    refreshStatus,
    currentTermsVersion: CURRENT_TERMS_VERSION,
    currentPrivacyVersion: CURRENT_PRIVACY_VERSION
  };
};
