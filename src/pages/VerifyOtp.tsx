import React, { useState, useEffect, useRef } from 'react';
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

const VerifyOtp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const hasSentOtp = useRef(false);

  // Récupérer l'email depuis la session ou le sessionStorage
  const pendingEmail = sessionStorage.getItem('pending_otp_email') || user?.email || '';

  // Attendre que la session soit prête
  useEffect(() => {
    if (!loading && session) {
      setSessionReady(true);
    }
  }, [loading, session]);

  useEffect(() => {
    // Si pas d'email en attente et pas en chargement, rediriger vers login
    if (!loading && !pendingEmail) {
      navigate('/login');
      return;
    }

    // Envoyer automatiquement l'OTP une seule fois quand la session est prête
    if (sessionReady && !hasSentOtp.current) {
      hasSentOtp.current = true;
      sendOtp();
    }
  }, [loading, pendingEmail, sessionReady]);

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
      // Attendre un peu pour s'assurer que la session est bien établie
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        console.log('Pas de session, attente...');
        // Réessayer après un court délai
        setTimeout(() => {
          setIsLoading(false);
          sendOtp();
        }, 1000);
        return;
      }

      console.log('Session trouvée, envoi OTP pour:', currentSession.user.email);

      const { data, error } = await supabase.functions.invoke('send-otp', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('Erreur send-otp:', error);
        throw new Error(error.message || 'Erreur lors de l\'envoi du code');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setOtpSent(true);
      setOtpCountdown(60);
      
      // Afficher le code (mode dev - pas d'envoi email sans Resend)
      if (data?.code) {
        setDevCode(data.code);
        console.log('Code OTP:', data.code);
      }
      
      toast.success('Code de vérification généré !');
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

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        navigate('/login');
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-otp-code', {
        body: { code: otpCode },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Erreur verify-otp:', error);
        throw new Error(error.message || 'Erreur de vérification');
      }

      if (data?.error) {
        toast.error(data.error);
        setIsLoading(false);
        return;
      }

      // Nettoyer le sessionStorage
      sessionStorage.removeItem('pending_otp_email');

      toast.success('Vérification réussie !');

      // Rediriger vers le dashboard approprié
      const { data: creatorData } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (creatorData) {
        navigate('/dashboard');
      } else {
        navigate('/subscriptions');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur de vérification');
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
            Vérification en 2 étapes
          </h1>
          <p className="text-muted-foreground mt-2">
            Un code de vérification est requis pour accéder à l'application
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
            {devCode && (
              <Alert className="bg-primary/10 border-primary">
                <Shield className="h-4 w-4 text-primary" />
                <AlertDescription className="font-mono text-lg font-bold text-primary">
                  Code: {devCode}
                </AlertDescription>
              </Alert>
            )}
            
            {!devCode && (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Chargement du code...
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
