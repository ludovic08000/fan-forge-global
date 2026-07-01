import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
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
  
  // Vérification de l'acceptation des CGU
  const { needsAcceptance, isLoading: termsLoading, refreshStatus } = useTermsAcceptance();
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Afficher le modal CGU si nécessaire
  useEffect(() => {
    if (!termsLoading && needsAcceptance && user) {
      setShowTermsModal(true);
    }
  }, [termsLoading, needsAcceptance, user]);

  const handleTermsAccepted = () => {
    setShowTermsModal(false);
    refreshStatus();
  };

  // Pour les callbacks externes, ne pas bloquer sur le loading des CGU
  if (loading || termsLoading) {
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
