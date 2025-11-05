import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, Key, Copy, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TwoFactorSetupProps {
  onComplete?: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onComplete }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'status' | 'enroll' | 'verify'>('status');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [factors, setFactors] = useState<any[]>([]);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      setFactors(data?.totp || []);
      setIsEnabled(data?.totp?.length > 0);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authentificateur',
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep('verify');
      toast.success('QR Code généré ! Scannez-le avec votre application d\'authentification.');
    } catch (error: any) {
      console.error('Error enrolling MFA:', error);
      toast.error(error.message || 'Erreur lors de l\'activation du 2FA');
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const factors = await supabase.auth.mfa.listFactors();
      if (!factors.data?.totp?.[0]) throw new Error('Facteur MFA non trouvé');

      const factorId = factors.data.totp[0].id;

      const { error } = await supabase.auth.mfa.challenge({ factorId });
      if (error) throw error;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: factorId,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      toast.success('2FA activé avec succès !');
      setIsEnabled(true);
      setStep('status');
      setVerifyCode('');
      checkMFAStatus();
      onComplete?.();
    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      toast.error(error.message || 'Code invalide. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver le 2FA ? Cela rendra votre compte moins sécurisé.')) {
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const factorsList = await supabase.auth.mfa.listFactors();
      const factor = factorsList.data?.totp?.[0];

      if (factor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
      }

      toast.success('2FA désactivé');
      setIsEnabled(false);
      setStep('status');
      checkMFAStatus();
    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      toast.error(error.message || 'Erreur lors de la désactivation du 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Code secret copié !');
  };

  if (step === 'verify') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Vérification 2FA
          </CardTitle>
          <CardDescription>
            Scannez le QR code avec votre application d'authentification et entrez le code à 6 chiffres
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Applications compatibles :</strong> Google Authenticator, Authy, Microsoft Authenticator, 1Password
            </AlertDescription>
          </Alert>

          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg border-2 border-border">
              <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
            </div>
            
            <div className="w-full space-y-2">
              <Label className="text-sm text-muted-foreground">
                Ou entrez ce code manuellement :
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={secret} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copySecret}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verify-code">Code de vérification</Label>
            <Input
              id="verify-code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Entrez le code à 6 chiffres affiché dans votre application
            </p>
          </div>

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
              onClick={handleVerify}
              disabled={isLoading || verifyCode.length !== 6}
              className="flex-1"
            >
              {isLoading ? 'Vérification...' : 'Vérifier et activer'}
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
          <Shield className="h-5 w-5 text-primary" />
          Authentification à deux facteurs (2FA)
        </CardTitle>
        <CardDescription>
          Ajoutez une couche de sécurité supplémentaire à votre compte
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
                <p className="font-medium">Authentification TOTP</p>
                <Badge variant={isEnabled ? "default" : "secondary"}>
                  {isEnabled ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isEnabled
                  ? 'Votre compte est protégé par 2FA. Un code sera requis à chaque connexion.'
                  : 'Protégez votre compte avec un code temporaire généré par une application.'}
              </p>
            </div>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            Le 2FA ajoute une protection supplémentaire en demandant un code à 6 chiffres 
            généré par une application d'authentification lors de chaque connexion, 
            en plus de votre mot de passe.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Comment ça fonctionne :</h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Installez une application d'authentification (Google Authenticator, Authy, etc.)</li>
            <li>Scannez le QR code que nous générerons</li>
            <li>Entrez le code à 6 chiffres pour activer</li>
            <li>À chaque connexion, entrez le code de votre application</li>
          </ol>
        </div>

        {isEnabled ? (
          <div className="space-y-4">
            <Alert>
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <strong>2FA actif</strong> - Votre compte est protégé. 
                {factors.length > 0 && (
                  <span className="block text-xs mt-1">
                    Activé le {new Date(factors[0].created_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </AlertDescription>
            </Alert>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Désactivation...' : 'Désactiver le 2FA'}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleEnroll}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Génération...' : 'Activer le 2FA'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
