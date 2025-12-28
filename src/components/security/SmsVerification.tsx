import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Smartphone, ShieldCheck, Shield, Phone, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SmsVerificationProps {
  onComplete?: () => void;
}

export const SmsVerification: React.FC<SmsVerificationProps> = ({ onComplete }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'status' | 'phone' | 'verify'>('status');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [factors, setFactors] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    checkPhoneMFAStatus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const checkPhoneMFAStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const phoneFactors = data?.phone || [];
      setFactors(phoneFactors);
      setIsEnabled(phoneFactors.some(f => f.status === 'verified'));
    } catch (error) {
      console.error('Error checking phone MFA status:', error);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');
    // Ensure it starts with + for international format
    if (cleaned && !cleaned.startsWith('+')) {
      return '+33' + cleaned.replace(/^0/, '');
    }
    return cleaned;
  };

  const handleEnroll = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'phone',
        phone: formattedPhone,
      });

      if (error) throw error;

      toast.success('Code SMS envoyé !');
      setStep('verify');
      setCountdown(60);
    } catch (error: any) {
      console.error('Error enrolling phone MFA:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi du SMS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast.error('Code invalide. Le code doit contenir 6 chiffres.');
      return;
    }

    setIsLoading(true);
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const phoneFactor = factorsData?.phone?.find(f => f.status === 'unverified');
      
      if (!phoneFactor) throw new Error('Facteur SMS non trouvé');

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: phoneFactor.id,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: phoneFactor.id,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      toast.success('Vérification SMS activée !');
      setIsEnabled(true);
      setStep('status');
      setVerifyCode('');
      setPhoneNumber('');
      checkPhoneMFAStatus();
      onComplete?.();
    } catch (error: any) {
      console.error('Error verifying phone MFA:', error);
      toast.error(error.message || 'Code invalide. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const phoneFactor = factorsData?.phone?.find(f => f.status === 'unverified');
      
      if (phoneFactor) {
        // Unenroll and re-enroll to resend
        await supabase.auth.mfa.unenroll({ factorId: phoneFactor.id });
      }
      
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const { error } = await supabase.auth.mfa.enroll({
        factorType: 'phone',
        phone: formattedPhone,
      });

      if (error) throw error;

      toast.success('Nouveau code envoyé !');
      setCountdown(60);
    } catch (error: any) {
      console.error('Error resending code:', error);
      toast.error('Erreur lors du renvoi du code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver la vérification SMS ?')) {
      return;
    }

    setIsLoading(true);
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const phoneFactor = factorsData?.phone?.[0];

      if (phoneFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: phoneFactor.id });
        if (error) throw error;
      }

      toast.success('Vérification SMS désactivée');
      setIsEnabled(false);
      setStep('status');
      checkPhoneMFAStatus();
    } catch (error: any) {
      console.error('Error disabling phone MFA:', error);
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
            <Smartphone className="h-5 w-5 text-primary" />
            Vérification SMS
          </CardTitle>
          <CardDescription>
            Entrez le code à 6 chiffres envoyé par SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Phone className="h-4 w-4" />
            <AlertDescription>
              Code envoyé au <strong>{phoneNumber}</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="sms-code">Code de vérification</Label>
            <Input
              id="sms-code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Entrez le code à 6 chiffres reçu par SMS
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
                setStep('phone');
                setVerifyCode('');
              }}
              disabled={isLoading}
              className="flex-1"
            >
              Retour
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

  if (step === 'phone') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Ajouter un numéro
          </CardTitle>
          <CardDescription>
            Entrez votre numéro de téléphone pour recevoir les codes de vérification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+33 6 12 34 56 78"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Format international recommandé (ex: +33612345678)
            </p>
          </div>

          <Alert>
            <AlertDescription>
              Un code de vérification sera envoyé par SMS à ce numéro.
              Des frais SMS standards peuvent s'appliquer.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep('status')}
              disabled={isLoading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={isLoading || !phoneNumber}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Envoyer le code'
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
          <Smartphone className="h-5 w-5 text-primary" />
          Vérification par SMS
        </CardTitle>
        <CardDescription>
          Recevez un code par SMS à chaque connexion
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
                <p className="font-medium">Authentification SMS</p>
                <Badge variant={isEnabled ? "default" : "secondary"}>
                  {isEnabled ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isEnabled
                  ? 'Un code SMS sera envoyé à chaque connexion pour vérifier votre identité.'
                  : 'Ajoutez une sécurité supplémentaire avec un code envoyé par SMS.'}
              </p>
              {isEnabled && factors.length > 0 && factors[0].phone && (
                <p className="text-xs text-muted-foreground">
                  Numéro: {factors[0].phone.replace(/(\+\d{2})(\d{1})(\d+)(\d{2})/, '$1 $2** *** **$4')}
                </p>
              )}
            </div>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            À chaque connexion, un code unique sera envoyé par SMS à votre téléphone.
            Vous devrez le saisir pour accéder à votre compte.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Avantages :</h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Protection contre l'accès non autorisé</li>
            <li>Notification immédiate en cas de tentative de connexion</li>
            <li>Aucune application supplémentaire requise</li>
            <li>Fonctionne sur tous les téléphones mobiles</li>
          </ul>
        </div>

        {isEnabled ? (
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Désactivation...' : 'Désactiver la vérification SMS'}
          </Button>
        ) : (
          <Button
            onClick={() => setStep('phone')}
            disabled={isLoading}
            className="w-full"
          >
            Activer la vérification SMS
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
