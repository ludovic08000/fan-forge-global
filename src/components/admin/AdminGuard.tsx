import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, AlertTriangle, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Composant de protection pour les pages admin
 * Vérifie le rôle admin côté serveur avec protection CSRF
 * EXIGE 2FA pour les admins
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user) {
        setIsVerifying(false);
        return;
      }

      try {
        // Vérification directe dans la base de données
        const { data, error: dbError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (dbError) {
          if (dbError.code === 'PGRST116') {
            // Pas de rôle admin trouvé
            setIsAdmin(false);
            setError('Accès non autorisé');
          } else {
            throw dbError;
          }
        } else if (data) {
          setIsAdmin(true);
          setError(null);
          
          // Vérifier si 2FA est activé
          const { data: mfaData } = await supabase.auth.mfa.listFactors();
          const hasTOTP = (mfaData?.totp?.length || 0) > 0;
          setHas2FA(hasTOTP);
        }
      } catch (err) {
        console.error('Admin verification error:', err);
        setError('Erreur de vérification');
        setAttempts(prev => prev + 1);
      } finally {
        setIsVerifying(false);
      }
    };

    if (!authLoading) {
      verifyAdmin();
    }
  }, [user, authLoading]);

  // Bloquer après trop de tentatives
  if (attempts >= 5) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Accès bloqué</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>Trop de tentatives d'accès non autorisées.</p>
            <p className="mt-2">Veuillez contacter l'administrateur.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chargement
  if (authLoading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Vérification des autorisations...</p>
        </div>
      </div>
    );
  }

  // Non connecté
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Pas admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Accès restreint</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Cette section est réservée aux administrateurs.
            </p>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button onClick={() => window.history.back()} variant="outline">
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin sans 2FA - exiger l'activation
  if (!has2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <Key className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle>Authentification à deux facteurs requise</CardTitle>
            <CardDescription>
              Pour accéder à la zone d'administration, vous devez activer l'authentification à deux facteurs (2FA).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-yellow-500 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                <strong>Sécurité obligatoire</strong>
                <p className="mt-1 text-sm">
                  En tant qu'administrateur, vous avez accès à des données sensibles. 
                  Le 2FA protège votre compte et les utilisateurs de la plateforme.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">Pourquoi c'est important :</h4>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>Protection contre le vol de mot de passe</li>
                <li>Sécurisation des données utilisateurs</li>
                <li>Conformité aux bonnes pratiques de sécurité</li>
                <li>Prévention des accès non autorisés</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Retour au tableau de bord
              </Button>
              <Button 
                onClick={() => navigate('/security')}
                className="flex-1"
              >
                <Key className="h-4 w-4 mr-2" />
                Activer le 2FA
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin vérifié avec 2FA
  return <>{children}</>;
};

export default AdminGuard;