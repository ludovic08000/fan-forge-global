import React, { useState } from 'react';
import SEOHead from '@/components/SEOHead';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft, Mail, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { authSchema } from '@/lib/validations';
import { useRateLimitServer } from '@/hooks/useRateLimitServer';
import { useBruteForceProtection } from '@/hooks/useBruteForceProtection';
import { useSecureEmailAction } from '@/hooks/useSecureEmailAction';
import { useTranslation } from '@/contexts/TranslationContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { signIn, user } = useAuth();
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
  const { sendAction: sendSecureEmailAction, isLoading: isSecureActionLoading, lastMessage } = useSecureEmailAction();
  const navigate = useNavigate();
  const [resetSuccess, setResetSuccess] = useState(false);

  const [signInForm, setSignInForm] = useState({
    email: '',
    password: ''
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const canProceed = await checkBeforeLogin(signInForm.email);
    if (!canProceed) {
      toast.error(`${t('login.accountBlocked')}. ${t('login.retryIn')} ${formatRemainingTime()}`);
      return;
    }
    
    const isAllowed = await checkRateLimit('auth');
    if (!isAllowed) return;

    setIsLoading(true);

    try {
      const validatedData = authSchema.parse(signInForm);
      
      const { error } = await signIn(validatedData.email, validatedData.password);
      
      if (error) {
        const result = await recordAttempt(validatedData.email, false, 'login');
        if (result.warning) {
          toast.warning(result.warning);
        }
        setIsLoading(false);
        return;
      }
      
      await recordAttempt(validatedData.email, true, 'login');
      
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
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
          setIsLoading(false);
          return;
        }

        sessionStorage.setItem('pending_otp_email', validatedData.email);
        navigate('/verify-otp');
      } else {
        navigate('/login');
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting pour éviter le spam de reset emails
    const isAllowed = await checkRateLimit('auth');
    if (!isAllowed) return;
    
    try {
      await sendSecureEmailAction('password_reset', resetEmail);
      setResetSuccess(true);
    } catch {
      // Toujours afficher succès pour ne pas révéler si l'email existe
      setResetSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('login.backToHome')}
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {t('login.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('login.subtitle')}
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>{t('login.signIn')}</CardTitle>
            <CardDescription>
              {t('login.enterCredentials')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {blocked && (
              <Alert variant="destructive" className="mb-4">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t('login.accountBlocked')}</strong>
                  <p className="text-sm mt-1">{reason}</p>
                  <p className="text-sm">{t('login.retryIn')} {formatRemainingTime()}</p>
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
                  {remainingAttempts} {t('login.attemptsRemaining')}
                </AlertDescription>
              </Alert>
            )}

            {showResetPassword ? (
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="mb-2"
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetSuccess(false);
                    setResetEmail('');
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
                
                {resetSuccess ? (
                  <Alert className="border-green-500 bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-500">
                      {lastMessage || t('login.ifAccountExists')}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">{t('login.email')}</Label>
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
                        {t('login.ifAccountExists')}
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isSecureActionLoading}
                    >
                      {isSecureActionLoading ? t('login.sending') : t('login.resetPassword')}
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('login.email')}</Label>
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
                  <Label htmlFor="password">{t('login.password')}</Label>
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
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || blocked}
                >
                  {isLoading ? t('login.signingIn') : blocked ? t('login.blocked') : t('login.signIn')}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={() => setShowResetPassword(true)}
                  >
                    {t('login.forgotPassword')}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('login.noAccount')}</span>{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                {t('login.createAccount')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
