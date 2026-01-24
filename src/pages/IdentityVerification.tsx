import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowLeft,
  FileCheck,
  User,
  Camera,
  CreditCard
} from 'lucide-react';
import IdentityVerificationForm from '@/components/identity/IdentityVerificationForm';

type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

const IdentityVerification: React.FC = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user) {
      checkStatus();
    }
  }, [user, loading, navigate]);

  const checkStatus = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Vérifier si l'utilisateur est un créateur
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      setIsCreator(!!creator);

      // Vérifier le statut de vérification
      const { data: verification } = await supabase
        .from('identity_verifications')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (verification) {
        setStatus(verification.status as VerificationStatus);
      }
    } catch (error) {
      console.error('Erreur vérification statut:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationComplete = () => {
    checkStatus();
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const steps = [
    { 
      icon: User, 
      label: 'Informations personnelles',
      description: 'Nom complet et date de naissance'
    },
    { 
      icon: CreditCard, 
      label: 'Document d\'identité',
      description: 'Carte d\'identité ou passeport'
    },
    { 
      icon: Camera, 
      label: 'Selfie de vérification',
      description: 'Photo avec votre document'
    },
    { 
      icon: FileCheck, 
      label: 'Validation',
      description: 'Vérification automatique par IA'
    }
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Vérification d'identité</h1>
            <p className="text-muted-foreground">
              Sécurisez votre compte et débloquez toutes les fonctionnalités
            </p>
          </div>
        </div>

        {/* Info card pour les créateurs */}
        {isCreator && status === 'none' && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-primary">Vérification obligatoire pour les créateurs</p>
                  <p className="text-sm text-muted-foreground">
                    La vérification d'identité est requise pour publier du contenu et recevoir des paiements. 
                    Cette procédure garantit la sécurité de tous les utilisateurs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étapes de vérification */}
        {status === 'none' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Processus de vérification
              </CardTitle>
              <CardDescription>
                La vérification se fait en 4 étapes simples et prend environ 2 minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {steps.map((step, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="p-2 rounded-full bg-primary/10">
                      <step.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Avantages */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Avantages de la vérification</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Badge vérifié visible sur votre profil
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Accès complet aux fonctionnalités de paiement
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Protection renforcée de votre compte
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Priorité dans les résultats de recherche
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulaire de vérification */}
        <IdentityVerificationForm onComplete={handleVerificationComplete} />

        {/* Informations de sécurité */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Vos données sont protégées</p>
                <p>
                  Vos documents d'identité sont stockés de manière sécurisée et chiffrée. 
                  Ils sont utilisés uniquement pour la vérification et sont supprimés après 30 jours.
                  Conformément au RGPD, vous pouvez demander leur suppression à tout moment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IdentityVerification;
