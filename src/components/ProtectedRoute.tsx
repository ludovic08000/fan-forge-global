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

  useEffect(() => {
    const checkProfileStatus = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      try {
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
  }, [user]);

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

  // Utilisateur connecté mais OTP non vérifié (seulement pour connexion email pure, pas OAuth)
  // Un utilisateur est considéré OAuth s'il a Google/Facebook dans ses providers OU si son provider principal est OAuth
  const providers = user.app_metadata?.providers as string[] | undefined;
  const mainProvider = user.app_metadata?.provider as string | undefined;
  
  const hasOAuthProvider = 
    mainProvider === 'google' || 
    mainProvider === 'facebook' ||
    providers?.includes('google') ||
    providers?.includes('facebook');
  
  // Si l'utilisateur a un provider OAuth, on le considère comme vérifié (pas besoin d'OTP email)
  if (otpVerified !== true && !hasOAuthProvider) {
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
