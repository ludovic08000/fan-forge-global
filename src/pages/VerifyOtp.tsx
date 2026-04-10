import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Page de vérification OTP pour les CONNEXIONS uniquement.
 * L'inscription utilise le lien email de Supabase (pas de code OTP).
 */
const VerifyOtp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const hasSentOtp = useRef(false);
  const hasCheckedStatus = useRef(false);
  const otpRequestInFlight = useRef(false);

  // Récupérer l'email depuis le sessionStorage (défini à la connexion)
  const pendingEmail = sessionStorage.getItem('pending_otp_email') || user?.email || '';

  const sendOtp = useCallback(async () => {
    if (otpCountdown > 0 || otpRequestInFlight.current) return;

    otpRequestInFlight.current = true;
    setIsLoading(true);
    
    try {
      const emailToUse = pendingEmail || user?.email;
      
      if (!emailToUse) {
        console.log('Pas d\'email disponible');
        toast.error('Email non disponible');
        navigate('/login');
        return;
      }

      console.log('Envoi OTP pour connexion:', emailToUse);

      const { error } = await supabase.auth.signInWithOtp({
        email: emailToUse,
        options: {
          shouldCreateUser: false,
        },
      });
      
      if (error) {
        console.error('Erreur signInWithOtp:', error);
        throw new Error(error.message || 'Erreur lors de l\'envoi du code');
      }

      setOtpSent(true);
      setOtpCountdown(60);
      
      console.log('✅ Code OTP envoyé avec succès à:', emailToUse);
      toast.success('Code de vérification envoyé par email !');
      
    } catch (error: any) {
      console.error('Erreur sendOtp:', error);
      const message = error?.message || 'Erreur lors de l\'envoi du code';

      if (message.toLowerCase().includes('rate limit')) {
        setOtpCountdown(60);
        toast.error('Trop de demandes de code. Patientez 60 secondes puis réessayez.');
      } else {
        toast.error(message);
      }
    } finally {
      otpRequestInFlight.current = false;
      setIsLoading(false);
    }
  }, [navigate, otpCountdown, pendingEmail, user?.email]);

  // Vérifier si l'utilisateur doit passer par l'OTP
  useEffect(() => {
    const checkLoginStatus = async () => {
      if (hasCheckedStatus.current || hasSentOtp.current || isRedirecting) return;
      if (loading) return;

      if (!pendingEmail) {
        console.log('Pas d\'email trouvé, redirection vers login');
        navigate('/login');
        return;
      }

      hasCheckedStatus.current = true;
      console.log('Email trouvé:', pendingEmail);

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        console.log('Session existante trouvée');
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('otp_verified')
          .eq('user_id', currentSession.user.id)
          .maybeSingle();
        
        if (profile?.otp_verified === true) {
          console.log('OTP déjà vérifié, redirection');
          setIsRedirecting(true);
          const { data: creatorData } = await supabase
            .from('creators')
            .select('id')
            .eq('user_id', currentSession.user.id)
            .maybeSingle();
          
          const savedRedirect = sessionStorage.getItem('redirect_after_auth');
          if (savedRedirect) {
            sessionStorage.removeItem('redirect_after_auth');
            navigate(savedRedirect, { replace: true });
          } else {
            navigate(creatorData ? '/dashboard' : '/subscriptions', { replace: true });
          }
          return;
        }
        
        console.log('OTP non vérifié, envoi OTP');
        hasSentOtp.current = true;
        sendOtp();
      } else {
        console.log('Pas de session, redirection vers login');
        navigate('/login');
      }
    };

    checkLoginStatus();
  }, [loading, pendingEmail, isRedirecting, navigate, sendOtp]);

  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);
      // Attendre que le chargement soit terminé
      if (loading) return;

      // Si pas d'email, rediriger vers login
      if (!pendingEmail) {
        console.log('Pas d\'email trouvé, redirection vers login');
        navigate('/login');
        return;
      }

      hasCheckedStatus.current = true;
      console.log('Email trouvé:', pendingEmail);

      // Vérifier s'il y a une session existante
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        console.log('Session existante trouvée');
        
        // Vérifier si otp_verified est déjà true dans le profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('otp_verified')
          .eq('user_id', currentSession.user.id)
          .maybeSingle();
        
        if (profile?.otp_verified === true) {
          console.log('OTP déjà vérifié, redirection');
          setIsRedirecting(true);
          // Déjà vérifié, rediriger vers le dashboard
          const { data: creatorData } = await supabase
            .from('creators')
            .select('id')
            .eq('user_id', currentSession.user.id)
            .maybeSingle();
          
          const savedRedirect = sessionStorage.getItem('redirect_after_auth');
          if (savedRedirect) {
            sessionStorage.removeItem('redirect_after_auth');
            navigate(savedRedirect, { replace: true });
          } else {
            navigate(creatorData ? '/dashboard' : '/subscriptions', { replace: true });
          }
          return;
        }
        
        // OTP pas encore vérifié, envoyer un nouveau code
        console.log('OTP non vérifié, envoi OTP');
        hasSentOtp.current = true;
        sendOtp();
      } else {
        // Pas de session, rediriger vers login
        console.log('Pas de session, redirection vers login');
        navigate('/login');
      }
    };

    checkLoginStatus();
  }, [loading, pendingEmail, isRedirecting, navigate, sendOtp]);

  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);


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
    setIsRedirecting(true);
    
    try {
      console.log('Vérification OTP pour:', emailToUse, 'code:', otpCode);
      
      // Vérifier avec type "email" pour signInWithOtp
      const verifyResult = await supabase.auth.verifyOtp({
        email: emailToUse,
        token: otpCode,
        type: 'email',
      });

      console.log('Résultat verifyOtp:', verifyResult);

      if (verifyResult.error) {
        console.error('Erreur verify-otp:', verifyResult.error);
        setIsRedirecting(false);
        
        if (verifyResult.error.message.includes('expired') || verifyResult.error.message.includes('Token has expired')) {
          throw new Error('Code expiré. Demandez un nouveau code.');
        } else if (verifyResult.error.message.includes('invalid') || verifyResult.error.message.includes('Invalid')) {
          throw new Error('Code invalide. Vérifiez le code et réessayez.');
        }
        throw new Error(verifyResult.error.message || 'Code invalide');
      }

      const { data } = verifyResult;

      // Mettre à jour le profil pour marquer l'OTP comme vérifié
      if (data.user) {
        console.log('Mise à jour otp_verified pour user:', data.user.id);
        await supabase
          .from('profiles')
          .update({ otp_verified: true })
          .eq('user_id', data.user.id);
      }

      // Nettoyer le sessionStorage
      sessionStorage.removeItem('pending_otp_email');

      toast.success('Vérification réussie !');

      // Rediriger vers le dashboard approprié
      const userId = data.user?.id || user?.id;
      if (userId) {
        const { data: creatorData } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        const savedRedirect = sessionStorage.getItem('redirect_after_auth');
        if (savedRedirect) {
          sessionStorage.removeItem('redirect_after_auth');
          navigate(savedRedirect, { replace: true });
        } else {
          navigate(creatorData ? '/dashboard' : '/subscriptions', { replace: true });
        }
      } else {
        const savedRedirect = sessionStorage.getItem('redirect_after_auth');
        if (savedRedirect) {
          sessionStorage.removeItem('redirect_after_auth');
          navigate(savedRedirect, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (error: any) {
      console.error('Erreur handleVerifyOtp:', error);
      toast.error(error.message || 'Code invalide. Réessayez.');
      setIsRedirecting(false);
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

  // Afficher un loader si on redirige
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Vérification en 2 étapes
          </h1>
          <p className="text-muted-foreground mt-2">
            Un code de vérification est requis pour accéder à votre compte
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Code de vérification
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
                  Code envoyé à <strong>{pendingEmail}</strong>. Vérifiez votre boîte de réception et vos spams.
                </AlertDescription>
              </Alert>
            )}
            
            {!otpSent && isLoading && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Envoi du code en cours...
                </AlertDescription>
              </Alert>
            )}

            {!otpSent && !isLoading && (
              <Alert className="bg-yellow-500/10 border-yellow-500">
                <Mail className="h-4 w-4 text-yellow-500" />
                <AlertDescription>
                  Cliquez sur "Renvoyer le code" pour recevoir votre code de vérification.
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

            <div className="text-center text-xs text-muted-foreground">
              <p>Vous ne recevez pas l'email ? Vérifiez vos spams ou utilisez une autre adresse email.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyOtp;
