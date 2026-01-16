import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const VerifyOtp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [isNewSignup, setIsNewSignup] = useState(false);
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const hasSentOtp = useRef(false);

  // Récupérer l'email depuis le sessionStorage (défini à l'inscription ou connexion)
  const pendingEmail = sessionStorage.getItem('pending_otp_email') || user?.email || '';

  // Détecter si c'est une nouvelle inscription ou une connexion
  useEffect(() => {
    const checkSignupStatus = async () => {
      if (hasSentOtp.current) return;
      
      // Si pas d'email, rediriger vers login
      if (!loading && !pendingEmail) {
        navigate('/login');
        return;
      }

      // Attendre que le chargement soit terminé
      if (loading) return;

      // Vérifier s'il y a une session existante (connexion) ou non (inscription)
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        // Connexion existante - vérifier si email déjà confirmé
        if (currentSession.user.email_confirmed_at) {
          // Email déjà confirmé, juste mettre à jour otp_verified et rediriger
          await supabase
            .from('profiles')
            .update({ otp_verified: true })
            .eq('user_id', currentSession.user.id);
          
          // Rediriger vers le dashboard approprié
          const { data: creatorData } = await supabase
            .from('creators')
            .select('id')
            .eq('user_id', currentSession.user.id)
            .maybeSingle();
          
          navigate(creatorData ? '/dashboard' : '/subscriptions');
          return;
        }
        
        // Email pas encore confirmé, envoyer OTP
        hasSentOtp.current = true;
        setIsNewSignup(false);
        sendOtp();
      } else if (pendingEmail) {
        // Nouvelle inscription - envoyer OTP pour vérification email
        hasSentOtp.current = true;
        setIsNewSignup(true);
        sendOtp();
      } else {
        navigate('/login');
      }
    };

    checkSignupStatus();
  }, [loading]);

  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const sendOtp = async () => {
    if (otpCountdown > 0) return;

    setIsLoading(true);
    try {
      const emailToUse = pendingEmail || user?.email;
      
      if (!emailToUse) {
        console.log('Pas d\'email disponible');
        toast.error('Email non disponible');
        navigate('/login');
        return;
      }

      console.log('Envoi OTP Supabase pour:', emailToUse);

      // Utiliser l'OTP natif de Supabase - type "signup" pour vérification email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToUse,
      });

      if (error) {
        // Si l'utilisateur est déjà confirmé, essayer avec signInWithOtp
        if (error.message.includes('already confirmed') || error.message.includes('already registered')) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: emailToUse,
            options: {
              shouldCreateUser: false,
            },
          });
          
          if (otpError) {
            console.error('Erreur Supabase OTP:', otpError);
            throw new Error(otpError.message || 'Erreur lors de l\'envoi du code');
          }
        } else {
          console.error('Erreur Supabase resend:', error);
          throw new Error(error.message || 'Erreur lors de l\'envoi du code');
        }
      }

      setOtpSent(true);
      setOtpCountdown(60);
      
      toast.success('Code de vérification envoyé par email !');
    } catch (error: any) {
      console.error('Erreur sendOtp:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi du code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Code invalide. Le code doit contenir 6 chiffres.');
      return;
    }

    const emailToUse = pendingEmail || user?.email;
    if (!emailToUse) {
      toast.error('Email non disponible');
      navigate('/login');
      return;
    }

    setIsLoading(true);
    try {
      // Essayer d'abord avec type "signup" pour les nouvelles inscriptions
      let verifyResult = await supabase.auth.verifyOtp({
        email: emailToUse,
        token: otpCode,
        type: 'signup',
      });

      // Si erreur, essayer avec type "email" pour les utilisateurs existants
      if (verifyResult.error) {
        verifyResult = await supabase.auth.verifyOtp({
          email: emailToUse,
          token: otpCode,
          type: 'email',
        });
      }

      if (verifyResult.error) {
        console.error('Erreur verify-otp:', verifyResult.error);
        
        if (verifyResult.error.message.includes('expired')) {
          throw new Error('Code expiré. Demandez un nouveau code.');
        } else if (verifyResult.error.message.includes('invalid')) {
          throw new Error('Code invalide. Vérifiez le code et réessayez.');
        }
        throw new Error(verifyResult.error.message || 'Code invalide');
      }

      const { data } = verifyResult;

      // Mettre à jour le profil pour marquer l'OTP comme vérifié
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ otp_verified: true })
          .eq('user_id', data.user.id);
      }

      // Nettoyer le sessionStorage
      sessionStorage.removeItem('pending_otp_email');

      toast.success(isNewSignup ? 'Compte activé avec succès !' : 'Vérification réussie !');

      // Rediriger vers le dashboard approprié
      const userId = data.user?.id || user?.id;
      if (userId) {
        const { data: creatorData } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        navigate(creatorData ? '/dashboard' : '/subscriptions');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Code invalide. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    // Déconnecter l'utilisateur s'il est connecté
    await supabase.auth.signOut();
    sessionStorage.removeItem('pending_otp_email');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {isNewSignup ? 'Validez votre compte' : 'Vérification en 2 étapes'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isNewSignup 
              ? 'Un code de vérification a été envoyé pour activer votre compte'
              : 'Un code de vérification est requis pour accéder à l\'application'
            }
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isNewSignup ? (
                <CheckCircle className="h-5 w-5 text-primary" />
              ) : (
                <Shield className="h-5 w-5 text-primary" />
              )}
              {isNewSignup ? 'Activez votre compte' : 'Code de vérification'}
            </CardTitle>
            <CardDescription>
              Entrez le code à 6 chiffres envoyé à {pendingEmail}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {otpSent && (
              <Alert className="bg-green-500/10 border-green-500">
                <Mail className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  {isNewSignup 
                    ? <>Code d'activation envoyé à <strong>{pendingEmail}</strong>. Vérifiez votre boîte de réception et vos spams.</>
                    : <>Code envoyé à <strong>{pendingEmail}</strong>. Vérifiez votre boîte de réception et vos spams.</>
                  }
                </AlertDescription>
              </Alert>
            )}
            
            {!otpSent && (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Envoi du code en cours...
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp-code">Code de vérification</Label>
              <Input
                id="otp-code"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
            </div>

            <div className="text-center">
              <Button
                variant="link"
                onClick={sendOtp}
                disabled={otpCountdown > 0 || isLoading}
                className="text-sm"
              >
                {otpCountdown > 0 ? `Renvoyer dans ${otpCountdown}s` : 'Renvoyer le code'}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button
                onClick={handleVerifyOtp}
                disabled={isLoading || otpCode.length !== 6}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Vérifier'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyOtp;
