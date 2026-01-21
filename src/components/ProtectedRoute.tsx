import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  const [hasBirthdate, setHasBirthdate] = useState<boolean | null>(null);
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const checkProfileStatus = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('otp_verified, birthdate')
          .eq('user_id', user.id)
          .single();

        setOtpVerified(profile?.otp_verified ?? false);
        setHasBirthdate(!!profile?.birthdate);

        // Calculer si l'utilisateur est majeur
        if (profile?.birthdate) {
          const today = new Date();
          const birth = new Date(profile.birthdate);
          let age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          setIsAdult(age >= 18);
        } else {
          setIsAdult(null);
        }
      } catch (error) {
        console.error('Erreur vérification profil:', error);
        setOtpVerified(false);
        setHasBirthdate(false);
        setIsAdult(null);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfileStatus();
  }, [user]);

  if (loading || checkingProfile) {
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

  // Utilisateur connecté mais sans date de naissance -> compléter le profil (OAuth)
  if (hasBirthdate === false) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Utilisateur mineur -> déconnexion et blocage
  if (isAdult === false) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Utilisateur connecté mais OTP non vérifié (et a une date de naissance = inscription classique)
  if (otpVerified === false && hasBirthdate === true) {
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

  return <>{children}</>;
};

export default ProtectedRoute;