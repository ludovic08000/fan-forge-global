import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, ShieldCheck, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface EmailOtpVerificationProps {
  onComplete?: () => void;
}

export const EmailOtpVerification: React.FC<EmailOtpVerificationProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'status' | 'verify'>('status');
  const [verifyCode, setVerifyCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    checkEmailOtpStatus();
  }, [user]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const checkEmailOtpStatus = async () => {
    if (!user) return;
    
    try {
      // Check if user has email OTP enabled in their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('user_id', user.id)
        .single();
      
      // For now, we use is_verified as a proxy for email OTP enabled
      // In a real implementation, you'd have a separate field
      setIsEnabled(profile?.is_verified || false);
    } catch (error) {
      console.error('Error checking email OTP status:', error);
    }
  };

  const handleSendCode = async () => {
    if (!user?.email) {
      toast.error('Email non disponible');
      return;
    }

    setIsLoading(true);
    try {
      // Send OTP to user's email
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      toast.success('Code envoyé à votre email !');
      setStep('verify');
      setCountdown(60);
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi du code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast.error('Code invalide. Le code doit contenir 6 chiffres.');
      return;
    }

    if (!user?.email) {
      toast.error('Email non disponible');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: user.email,
        token: verifyCode,
        type: 'email',
      });

      if (error) throw error;

      // Mark email OTP as enabled in profile
      await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('user_id', user.id);

      toast.success('Vérification email activée !');
      setIsEnabled(true);
      setStep('status');
      setVerifyCode('');
      onComplete?.();
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Code invalide. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleSendCode();
  };

  const handleDisable = async () => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver la vérification email ?')) {
      return;
    }

    setIsLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ is_verified: false })
        .eq('user_id', user?.id);

      toast.success('Vérification email désactivée');
      setIsEnabled(false);
    } catch (error: any) {
      console.error('Error disabling email OTP:', error);
      toast.error(error.message || 'Erreur lors de la désactivation');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Vérification Email
          </CardTitle>
          <CardDescription>
            Entrez le code à 6 chiffres envoyé à votre email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Code envoyé à <strong>{user?.email}</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="email-code">Code de vérification</Label>
            <Input
              id="email-code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Vérifiez votre boîte de réception et vos spams
            </p>
          </div>

          <div className="text-center">
            <Button
              variant="link"
              onClick={handleResendCode}
              disabled={countdown > 0 || isLoading}
              className="text-sm"
            >
              {countdown > 0 ? `Renvoyer dans ${countdown}s` : 'Renvoyer le code'}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStep('status');
                setVerifyCode('');
              }}
              disabled={isLoading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleVerify}
              disabled={isLoading || verifyCode.length !== 6}
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
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Vérification par Email (OTP)
        </CardTitle>
        <CardDescription>
          Recevez un code par email à chaque connexion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between p-4 rounded-lg border bg-muted/50">
          <div className="flex items-start gap-3">
            {isEnabled ? (
              <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">Authentification Email OTP</p>
                <Badge variant={isEnabled ? "default" : "secondary"}>
                  {isEnabled ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isEnabled
                  ? 'Un code sera envoyé à votre email à chaque connexion.'
                  : 'Ajoutez une sécurité supplémentaire avec un code envoyé par email.'}
              </p>
              {isEnabled && user?.email && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Email vérifié: {user.email}
                </p>
              )}
            </div>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            À chaque connexion, un code unique sera envoyé à votre adresse email.
            Vous devrez le saisir pour accéder à votre compte.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Avantages :</h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>100% gratuit - aucun frais SMS</li>
            <li>Protection contre l'accès non autorisé</li>
            <li>Notification immédiate en cas de tentative de connexion</li>
            <li>Fonctionne sur tous les appareils</li>
          </ul>
        </div>

        {isEnabled ? (
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Désactivation...' : 'Désactiver la vérification email'}
          </Button>
        ) : (
          <Button
            onClick={handleSendCode}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              'Activer la vérification email'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
