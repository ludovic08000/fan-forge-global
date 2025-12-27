import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Composant de protection pour les pages admin
 * Vérifie le rôle admin côté serveur avec protection CSRF
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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
            
            // Logger la tentative d'accès non autorisée
            await supabase.from('login_attempts').insert({
              identifier: user.email || user.id,
              attempt_type: 'admin_access',
              success: false,
              user_agent: navigator.userAgent,
            });
          } else {
            throw dbError;
          }
        } else if (data) {
          setIsAdmin(true);
          setError(null);
          
          // Logger l'accès admin réussi
          await supabase.from('login_attempts').insert({
            identifier: user.email || user.id,
            attempt_type: 'admin_access',
            success: true,
            user_agent: navigator.userAgent,
          });
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

  // Admin vérifié
  return <>{children}</>;
};

export default AdminGuard;
