import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Calendar, AlertTriangle } from 'lucide-react';

const CompleteProfile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [birthdate, setBirthdate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Calculer l'âge à partir de la date de naissance
  const calculateAge = (birthdateStr: string): number => {
    const today = new Date();
    const birth = new Date(birthdateStr);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Vérifier si le profil est déjà complet
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('birthdate')
          .eq('user_id', user.id)
          .single();

        // Si la date de naissance existe et l'utilisateur a 18+, rediriger
        if (profile?.birthdate) {
          const age = calculateAge(profile.birthdate);
          if (age >= 18) {
            navigate('/subscriptions', { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error('Erreur vérification profil:', error);
      } finally {
        setCheckingProfile(false);
      }
    };

    if (!loading) {
      checkProfile();
    }
  }, [user, loading, navigate]);

  // Vérifier l'âge quand la date change
  useEffect(() => {
    if (birthdate) {
      const age = calculateAge(birthdate);
      setIsMinor(age < 18);
    } else {
      setIsMinor(false);
    }
  }, [birthdate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !birthdate) {
      toast.error('Veuillez renseigner votre date de naissance');
      return;
    }

    const age = calculateAge(birthdate);
    if (age < 18) {
      toast.error('Vous devez avoir au moins 18 ans pour utiliser cette plateforme');
      return;
    }

    setIsSubmitting(true);

    try {
      // Mettre à jour le profil avec la date de naissance
      const { error } = await supabase
        .from('profiles')
        .update({ 
          birthdate,
          otp_verified: true // Les utilisateurs OAuth sont considérés comme vérifiés
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profil complété avec succès !');
      navigate('/subscriptions', { replace: true });
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  // Affichage pour les mineurs
  if (isMinor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Accès refusé</CardTitle>
            <CardDescription>
              Cette plateforme est réservée aux personnes majeures (18 ans et plus).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Conformément à la réglementation en vigueur, nous ne pouvons pas vous autoriser l'accès à ce contenu.
            </p>
            <Button 
              variant="outline" 
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/');
              }}
            >
              Quitter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Vérification de l'âge</CardTitle>
          <CardDescription>
            Pour accéder à notre plateforme, nous devons vérifier que vous avez au moins 18 ans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="birthdate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date de naissance
              </Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                className="w-full"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Cette information est requise par la loi pour les plateformes de contenu adulte. 
                  Vos données sont protégées et ne seront jamais partagées.
                </span>
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !birthdate}
            >
              {isSubmitting ? 'Vérification...' : 'Confirmer mon âge'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
