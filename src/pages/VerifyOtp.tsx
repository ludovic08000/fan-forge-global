import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Loader2, ArrowLeft, CheckCircle, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const VerifyOtp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [isNewSignup, setIsNewSignup] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const hasSentOtp = useRef(false);

  // Récupérer l'email depuis le sessionStorage (défini à l'inscription ou connexion)
  const pendingEmail = sessionStorage.getItem('pending_otp_email') || user?.email || '';

  // Détecter si c'est une nouvelle inscription ou une connexion existante
  useEffect(() => {
    const checkSignupStatus = async () => {
      if (hasSentOtp.current) return;
      
      // Vérifier si c'est une nouvelle inscription via sessionStorage
      const isFromSignup = sessionStorage.getItem('pending_otp_email');
      
      // Si pas d'email et pas de session, rediriger vers login
      if (!loading && !pendingEmail && !isFromSignup) {
        console.log('Pas d\'email trouvé, redirection vers login');
        navigate('/login');
        return;
      }

      // Attendre que le chargement soit terminé
      if (loading) return;

      console.log('Email trouvé:', pendingEmail);
      console.log('Nouvelle inscription:', !!isFromSignup);

      // Si c'est une nouvelle inscription (venant de signup), toujours envoyer l'OTP
      if (isFromSignup) {
        console.log('Nouvelle inscription détectée, envoi OTP');
        hasSentOtp.current = true;
        setIsNewSignup(true);
        sendOtp();
        return;
      }

      // Vérifier s'il y a une session existante (connexion)
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
          // Déjà vérifié, rediriger vers le dashboard
          const { data: creatorData } = await supabase
            .from('creators')
            .select('id')
            .eq('user_id', currentSession.user.id)
            .maybeSingle();
          
          navigate(creatorData ? '/dashboard' : '/subscriptions');
          return;
        }
        
        // OTP pas encore vérifié, envoyer un nouveau code
        console.log('OTP non vérifié, envoi OTP');
        hasSentOtp.current = true;
        setIsNewSignup(false);
        sendOtp();
      } else {
        // Pas de session, rediriger vers login
        console.log('Pas de session, redirection vers login');
        navigate('/login');
      }
    };

    checkSignupStatus();
  }, [loading, pendingEmail]);

  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const sendOtp = async () => {
    if (otpCountdown > 0) return;

    setIsLoading(true);
    setDebugCode(null);
    
    try {
      const emailToUse = pendingEmail || user?.email;
      
      if (!emailToUse) {
        console.log('Pas d\'email disponible');
        toast.error('Email non disponible');
        navigate('/login');
        return;
      }

      console.log('Envoi OTP pour:', emailToUse, 'isNewSignup:', isNewSignup);

      let success = false;

      // Pour les nouvelles inscriptions, utiliser resend type signup
      if (isNewSignup) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: emailToUse,
        });
        
        if (!error) {
          success = true;
        } else {
          console.error('Erreur resend signup:', error);
        }
      }

      // Pour les connexions existantes ou si resend a échoué, utiliser signInWithOtp
      if (!success) {
        console.log('Utilisation de signInWithOtp...');
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
      }

      setOtpSent(true);
      setOtpCountdown(60);
      
      console.log('✅ Code OTP envoyé avec succès à:', emailToUse);
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
      console.log('Vérification OTP pour:', emailToUse, 'code:', otpCode);
      
      // Essayer d'abord avec type "email" (pour signInWithOtp)
      let verifyResult = await supabase.auth.verifyOtp({
        email: emailToUse,
        token: otpCode,
        type: 'email',
      });

      console.log('Résultat verifyOtp (email):', verifyResult);

      // Si erreur, essayer avec type "signup"
      if (verifyResult.error) {
        console.log('Tentative avec type signup...');
        verifyResult = await supabase.auth.verifyOtp({
          email: emailToUse,
          token: otpCode,
          type: 'signup',
        });
        console.log('Résultat verifyOtp (signup):', verifyResult);
      }

      if (verifyResult.error) {
        console.error('Erreur verify-otp:', verifyResult.error);
        
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
      console.error('Erreur handleVerifyOtp:', error);
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

  const copyDebugCode = () => {
    if (debugCode) {
      navigator.clipboard.writeText(debugCode);
      toast.success('Code copié !');
    }
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

            {/* Mode développement: afficher le code si disponible */}
            {debugCode && (
              <Alert className="bg-blue-500/10 border-blue-500">
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    <strong>Mode DEV:</strong> Code OTP: <code className="bg-blue-500/20 px-2 py-1 rounded font-mono text-lg">{debugCode}</code>
                  </span>
                  <Button variant="ghost" size="sm" onClick={copyDebugCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
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
