import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft, Mail, UserCircle, Video } from 'lucide-react';
import { signUpSchema } from '@/lib/validations';
import { useRateLimitServer } from '@/hooks/useRateLimitServer';
import { toast } from 'sonner';
import { z } from 'zod';
import { PasswordRequirements } from '@/components/PasswordRequirements';

const Signup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, signUpWithGoogle, user } = useAuth();
  const { checkRateLimit } = useRateLimitServer();
  const navigate = useNavigate();

  const [signUpForm, setSignUpForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    username: '',
    role: 'subscriber' as 'subscriber' | 'creator',
    birthdate: '',
    gender: '',
    stageName: '',
    category: '',
    termsAccepted: false,
    privacyAccepted: false
  });

  const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isAllowed = await checkRateLimit('auth');
    if (!isAllowed) return;

    setIsLoading(true);
    setSignUpErrors({});

    try {
      const validatedData = signUpSchema.parse(signUpForm);

      const { error } = await signUp(
        validatedData.email,
        validatedData.password,
        validatedData.firstName,
        validatedData.lastName,
        validatedData.username,
        validatedData.role,
        validatedData.birthdate || undefined,
        validatedData.gender,
        validatedData.stageName,
        validatedData.category
      );
      
      if (!error) {
        // Stocker l'email pour la page OTP
        sessionStorage.setItem('pending_otp_email', validatedData.email);
        // Rediriger vers la page de vérification OTP
        navigate('/verify-otp');
      } else {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('already') || msg.includes('registered')) {
          setSignUpErrors({ email: 'Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.' });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as string;
          if (field && !errors[field]) {
            errors[field] = err.message;
          }
        });
        setSignUpErrors(errors);
        toast.error('Veuillez corriger les erreurs du formulaire');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    await signUpWithGoogle();
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Inscription
          </h1>
          <p className="text-muted-foreground mt-2">
            Créez votre compte gratuitement
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Créer un compte</CardTitle>
            <CardDescription>
              Rejoignez notre communauté de créateurs et abonnés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <Button 
                type="button"
                variant="outline" 
                className="w-full h-12 text-foreground border-border hover:bg-muted"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                S'inscrire avec Google
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

            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Sélection du rôle */}
              <div className="space-y-3">
                <Label>Type de compte</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSignUpForm({ ...signUpForm, role: 'subscriber' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      signUpForm.role === 'subscriber'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <UserCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <div className="text-sm font-medium">Utilisateur</div>
                    <div className="text-xs text-muted-foreground mt-1">Accéder au contenu</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignUpForm({ ...signUpForm, role: 'creator' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      signUpForm.role === 'creator'
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <Video className="w-8 h-8 mx-auto mb-2 text-accent" />
                    <div className="text-sm font-medium">Créateur</div>
                    <div className="text-xs text-muted-foreground mt-1">Publier du contenu</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Prénom"
                    required
                    className={signUpErrors.firstName ? 'border-destructive' : ''}
                    value={signUpForm.firstName}
                    onChange={(e) => {
                      setSignUpForm({ ...signUpForm, firstName: e.target.value });
                      if (signUpErrors.firstName) setSignUpErrors(prev => ({ ...prev, firstName: '' }));
                    }}
                  />
                  {signUpErrors.firstName && (
                    <p className="text-xs text-destructive">{signUpErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Nom"
                    required
                    className={signUpErrors.lastName ? 'border-destructive' : ''}
                    value={signUpForm.lastName}
                    onChange={(e) => {
                      setSignUpForm({ ...signUpForm, lastName: e.target.value });
                      if (signUpErrors.lastName) setSignUpErrors(prev => ({ ...prev, lastName: '' }));
                    }}
                  />
                  {signUpErrors.lastName && (
                    <p className="text-xs text-destructive">{signUpErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Pseudo pour les utilisateurs */}
              {signUpForm.role === 'subscriber' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="username">Pseudo</Label>
                    <span className="text-xs text-muted-foreground">{signUpForm.username.length}/30</span>
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Ex: john_doe"
                    className={signUpErrors.username ? 'border-destructive' : ''}
                    value={signUpForm.username}
                    onChange={(e) => {
                      setSignUpForm({ ...signUpForm, username: e.target.value });
                      if (signUpErrors.username) setSignUpErrors(prev => ({ ...prev, username: '' }));
                    }}
                  />
                  {signUpErrors.username ? (
                    <p className="text-xs text-destructive">{signUpErrors.username}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Optionnel - Ce pseudo sera visible par les autres utilisateurs
                    </p>
                  )}
                </div>
              )}

              {/* Champs spécifiques pour les créateurs */}
              {signUpForm.role === 'creator' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="stageName">Surnom / Nom de scène *</Label>
                    <Input
                      id="stageName"
                      type="text"
                      placeholder="Ex: Luna_Star"
                      required={signUpForm.role === 'creator'}
                      value={signUpForm.stageName}
                      onChange={(e) => setSignUpForm({ ...signUpForm, stageName: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ce nom sera visible publiquement
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie de contenu *</Label>
                    <Select
                      value={signUpForm.category}
                      onValueChange={(value) => setSignUpForm({ ...signUpForm, category: value })}
                      required={signUpForm.role === 'creator'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        <SelectItem value="art">Art</SelectItem>
                        <SelectItem value="mode">Mode</SelectItem>
                        <SelectItem value="musique">Musique</SelectItem>
                        <SelectItem value="gaming">Gaming</SelectItem>
                        <SelectItem value="cuisine">Cuisine</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Genre *</Label>
                    <Select
                      value={signUpForm.gender}
                      onValueChange={(value) => setSignUpForm({ ...signUpForm, gender: value })}
                      required={signUpForm.role === 'creator'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez votre genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="femme">Femme</SelectItem>
                        <SelectItem value="homme">Homme</SelectItem>
                        <SelectItem value="non-binaire">Non-binaire</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="votre@email.com"
                    className={`pl-10 ${signUpErrors.email ? 'border-destructive' : ''}`}
                    aria-invalid={!!signUpErrors.email}
                    required
                    value={signUpForm.email}
                    onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                  />
                </div>
                {signUpErrors.email && (
                  <p className="text-sm text-destructive">{signUpErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    className={signUpErrors.password ? 'border-destructive' : ''}
                    value={signUpForm.password}
                    onChange={(e) => {
                      setSignUpForm({ ...signUpForm, password: e.target.value });
                      if (signUpErrors.password) setSignUpErrors(prev => ({ ...prev, password: '' }));
                    }}
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
                {signUpErrors.password && (
                  <p className="text-xs text-destructive">{signUpErrors.password}</p>
                )}
                <PasswordRequirements password={signUpForm.password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={signUpForm.confirmPassword}
                    onChange={(e) => setSignUpForm({ ...signUpForm, confirmPassword: e.target.value })}
                    className={signUpForm.password && signUpForm.confirmPassword && signUpForm.password !== signUpForm.confirmPassword ? "border-destructive" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {signUpForm.password && signUpForm.confirmPassword && signUpForm.password !== signUpForm.confirmPassword && (
                  <p className="text-sm text-destructive">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              {/* Acceptation des CGU et Politique de confidentialité */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="termsAccepted"
                    checked={signUpForm.termsAccepted}
                    onCheckedChange={(checked) => setSignUpForm({ ...signUpForm, termsAccepted: checked === true })}
                  />
                  <Label htmlFor="termsAccepted" className="text-sm leading-relaxed cursor-pointer">
                    J'ai lu et j'accepte les{' '}
                    <Link to="/terms" target="_blank" className="text-primary hover:underline">
                      Conditions Générales d'Utilisation
                    </Link>
                    {' '}*
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="privacyAccepted"
                    checked={signUpForm.privacyAccepted}
                    onCheckedChange={(checked) => setSignUpForm({ ...signUpForm, privacyAccepted: checked === true })}
                  />
                  <Label htmlFor="privacyAccepted" className="text-sm leading-relaxed cursor-pointer">
                    J'ai lu et j'accepte la{' '}
                    <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                      Politique de Confidentialité
                    </Link>
                    {' '}et le traitement de mes données conformément au RGPD *
                  </Label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || (signUpForm.password !== signUpForm.confirmPassword) || !signUpForm.termsAccepted || !signUpForm.privacyAccepted}
              >
                {isLoading ? 'Création...' : 'Créer un compte'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Déjà un compte ?</span>{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
