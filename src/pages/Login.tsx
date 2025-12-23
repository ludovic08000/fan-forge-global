import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft, Mail, AlertTriangle, Shield } from 'lucide-react';
import { authSchema } from '@/lib/validations';
import { useRateLimitServer } from '@/hooks/useRateLimitServer';
import { useBruteForceProtection } from '@/hooks/useBruteForceProtection';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { signIn, signInWithGoogle, signInWithFacebook, user } = useAuth();
  const { checkRateLimit } = useRateLimitServer();
  const { 
    blocked, 
    reason, 
    remainingAttempts, 
    warning,
    checkBeforeLogin, 
    recordAttempt,
    formatRemainingTime 
  } = useBruteForceProtection();
  const navigate = useNavigate();

  const [signInForm, setSignInForm] = useState({
    email: '',
    password: ''
  });

  // Ne pas rediriger automatiquement ici, laisser handleSignIn gérer la redirection
  // pour éviter un flash de la page d'accueil

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier le blocage brute force
    const canProceed = await checkBeforeLogin(signInForm.email);
    if (!canProceed) {
      toast.error(`Compte temporairement bloqué. Réessayez dans ${formatRemainingTime()}`);
      return;
    }
    
    const isAllowed = await checkRateLimit('auth');
    if (!isAllowed) return;

    setIsLoading(true);

    try {
      const validatedData = authSchema.parse(signInForm);
      
      const { error } = await signIn(validatedData.email, validatedData.password);
      
      if (error) {
        // Enregistrer l'échec
        const result = await recordAttempt(validatedData.email, false, 'login');
        if (result.warning) {
          toast.warning(result.warning);
        }
        return;
      }
      
      // Enregistrer le succès
      await recordAttempt(validatedData.email, true, 'login');
      
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        // Check if user is suspended
        const { data: suspension } = await supabase
          .from('user_suspensions')
          .select('reason, suspended_at')
          .eq('user_id', userData.user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (suspension) {
          await supabase.auth.signOut();
          sessionStorage.setItem('suspension_details', JSON.stringify(suspension));
          navigate('/suspended');
          return;
        }

        const { data: creatorData } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        
        if (creatorData) {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          toast.error(err.message);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signInWithGoogle();
    setIsLoading(false);
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    await signInWithFacebook();
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.');
        setShowResetPassword(false);
        setResetEmail('');
      }
    } catch (error: any) {
      toast.error('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Connexion
          </h1>
          <p className="text-muted-foreground mt-2">
            Accédez à votre compte
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Se connecter</CardTitle>
            <CardDescription>
              Entrez vos identifiants pour accéder à votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Alert brute force */}
            {blocked && (
              <Alert variant="destructive" className="mb-4">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Compte temporairement bloqué</strong>
                  <p className="text-sm mt-1">{reason}</p>
                  <p className="text-sm">Réessayez dans {formatRemainingTime()}</p>
                </AlertDescription>
              </Alert>
            )}
            
            {!blocked && warning && (
              <Alert className="mb-4 border-yellow-500 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-500">
                  {warning}
                </AlertDescription>
              </Alert>
            )}
            
            {!blocked && remainingAttempts !== undefined && remainingAttempts <= 3 && remainingAttempts > 0 && (
              <Alert className="mb-4 border-orange-500 bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-orange-500">
                  {remainingAttempts} tentative{remainingAttempts > 1 ? 's' : ''} restante{remainingAttempts > 1 ? 's' : ''} avant blocage
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 mb-6">
              <Button 
                type="button"
                variant="outline" 
                className="w-full h-12 text-foreground border-border hover:bg-muted"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuer avec Google
              </Button>
              
              <Button 
                type="button"
                variant="outline" 
                className="w-full h-12 text-foreground border-border hover:bg-muted"
                onClick={handleFacebookSignIn}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continuer avec Facebook
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Ou avec email
                  </span>
                </div>
              </div>
            </div>

            {showResetPassword ? (
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="mb-2"
                  onClick={() => setShowResetPassword(false)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="votre@email.com"
                        className="pl-10"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vous recevrez un lien de réinitialisation par email
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Envoi...' : 'Réinitialiser mon mot de passe'}
                  </Button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      className="pl-10"
                      required
                      value={signInForm.email}
                      onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={signInForm.password}
                      onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || blocked}
                >
                  {isLoading ? 'Connexion...' : blocked ? 'Compte bloqué' : 'Se connecter'}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={() => setShowResetPassword(true)}
                  >
                    Mot de passe oublié ?
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Pas encore de compte ?</span>{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Créer un compte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
