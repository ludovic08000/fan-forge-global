import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import TermsAcceptanceModal from '@/components/TermsAcceptanceModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: UserRole | UserRole[];
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireRole,
  fallbackPath = '/login'
}) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const [otpVerified, setOtpVerified] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  
  // Vérification de l'acceptation des CGU
  const { needsAcceptance, isLoading: termsLoading, refreshStatus } = useTermsAcceptance();
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Détecter si c'est un callback externe (Stripe, etc.)
  const urlParams = new URLSearchParams(window.location.search);
  const isExternalCallback = urlParams.get('stripe_connect') === 'success' ||
                              urlParams.get('boost_success') === 'true' ||
                              urlParams.get('boost_canceled') === 'true';

  useEffect(() => {
    const checkProfileStatus = async () => {
      // Attendre que le loading soit terminé
      if (loading) {
        return;
      }

      if (!user) {
        setCheckingProfile(false);
        return;
      }

      // Vérifier si on revient d'un callback externe (Stripe Connect, boost, etc.)
      const urlParams = new URLSearchParams(window.location.search);
      const isExternalCallback = urlParams.get('stripe_connect') === 'success' ||
                                  urlParams.get('boost_success') === 'true' ||
                                  urlParams.get('boost_canceled') === 'true';

      try {
        // Si c'est un callback externe, mettre à jour otp_verified IMMÉDIATEMENT
        // car l'utilisateur était déjà authentifié avant de partir vers Stripe
        if (isExternalCallback) {
          console.log('📧 Retour de callback externe, mise à jour otp_verified immédiate');
          await supabase
            .from('profiles')
            .update({ otp_verified: true })
            .eq('user_id', user.id);
          setOtpVerified(true);
          setCheckingProfile(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('otp_verified')
          .eq('user_id', user.id)
          .single();

        setOtpVerified(profile?.otp_verified ?? false);
      } catch (error) {
        console.error('Erreur vérification profil:', error);
        setOtpVerified(false);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfileStatus();
  }, [user, loading]);

  // Afficher le modal CGU si nécessaire
  useEffect(() => {
    if (!termsLoading && needsAcceptance && user && !checkingProfile) {
      setShowTermsModal(true);
    }
  }, [termsLoading, needsAcceptance, user, checkingProfile]);

  const handleTermsAccepted = () => {
    setShowTermsModal(false);
    refreshStatus();
  };

  // Pour les callbacks externes, ne pas bloquer sur le loading des CGU
  if (loading || checkingProfile || termsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Pas d'utilisateur connecté -> redirection vers login
  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Utilisateur connecté mais OTP non vérifié
  if (otpVerified !== true) {
    // Stocker l'email pour la page OTP
    if (user.email) {
      sessionStorage.setItem('pending_otp_email', user.email);
    }
    return <Navigate to="/verify-otp" replace />;
  }

  // Vérification du rôle si requis
  if (requireRole) {
    const requiredRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    
    if (userRole && !requiredRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <>
      {/* Modal d'acceptation des CGU (bloquant) */}
      <TermsAcceptanceModal 
        isOpen={showTermsModal} 
        onAccepted={handleTermsAccepted}
      />
      {children}
    </>
  );
};

export default ProtectedRoute;
