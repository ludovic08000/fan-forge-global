import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft, Mail, UserCircle, Video, AlertTriangle, ShieldX, CalendarDays } from 'lucide-react';
import { signUpSchema } from '@/lib/validations';
import { useRateLimitServer } from '@/hooks/useRateLimitServer';
import { toast } from 'sonner';
import { z } from 'zod';
import { PasswordRequirements } from '@/components/PasswordRequirements';

// Fonction pour calculer l'âge - retourne null si date invalide ou incomplète
const calculateAge = (birthdate: string): number | null => {
  if (!birthdate) return null;
  
  // Vérifier que le format est complet (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(birthdate)) return null;
  
  const [yearStr, monthStr, dayStr] = birthdate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  
  // Vérifier que les valeurs sont valides
  if (year < 1900 || year > new Date().getFullYear()) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  const birthDate = new Date(year, month - 1, day);
  // Vérifier que la date créée correspond bien aux valeurs entrées (évite les dates invalides comme 31 février)
  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
    return null;
  }
  
  const today = new Date();
  // Vérifier que la date n'est pas dans le futur
  if (birthDate > today) return null;
  
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  return monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
};

const Signup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMinorBlocked, setIsMinorBlocked] = useState(false);
  const { signUp, signInWithGoogle, signInWithFacebook, user } = useAuth();
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
    category: ''
  });

  const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({});

  // Vérification d'âge en temps réel - seulement si l'âge est calculable (date valide)
  const userAge = useMemo(() => calculateAge(signUpForm.birthdate), [signUpForm.birthdate]);
  const isMinor = useMemo(() => userAge !== null && userAge < 18, [userAge]);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Effet pour bloquer les mineurs
  useEffect(() => {
    if (isMinor) {
      setIsMinorBlocked(true);
    }
  }, [isMinor]);

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
        validatedData.birthdate,
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

  // Écran de blocage pour les mineurs
  if (isMinorBlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-destructive/20 p-4 rounded-2xl w-fit animate-pulse">
              <ShieldX className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">
              Accès Refusé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/30 space-y-3">
              <div className="flex items-center gap-2 text-destructive font-semibold">
                <AlertTriangle className="h-5 w-5" />
                <span>Inscription interdite aux mineurs</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vous avez déclaré avoir <strong className="text-destructive">{userAge} ans</strong>. 
                Cette plateforme est strictement réservée aux personnes majeures (18 ans et plus).
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                <strong>Avertissement légal :</strong> Conformément à la législation française (Loi n° 2020-936), 
                l'accès à ce site est strictement interdit aux personnes de moins de 18 ans. 
                Toute tentative d'inscription frauduleuse avec une fausse date de naissance est passible de poursuites.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = 'https://www.google.com'}
                className="w-full bg-destructive hover:bg-destructive/90"
              >
                Quitter le site
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Vous serez redirigé vers Google
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

              {/* Date de naissance OBLIGATOIRE pour tous */}
              <div className="space-y-2">
                <Label htmlFor="birthdate" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Date de naissance *
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  required
                  className={signUpErrors.birthdate || isMinor ? 'border-destructive' : ''}
                  value={signUpForm.birthdate}
                  onChange={(e) => {
                    setSignUpForm({ ...signUpForm, birthdate: e.target.value });
                    if (signUpErrors.birthdate) setSignUpErrors(prev => ({ ...prev, birthdate: '' }));
                  }}
                  max={new Date().toISOString().split('T')[0]}
                />
                {signUpErrors.birthdate ? (
                  <p className="text-xs text-destructive">{signUpErrors.birthdate}</p>
                ) : isMinor ? (
                  <div className="flex items-center gap-2 text-destructive text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Vous devez avoir au moins 18 ans pour vous inscrire</span>
                  </div>
                ) : userAge !== null && userAge >= 18 ? (
                  <p className="text-xs text-green-500">
                    ✓ Vous avez {userAge} ans - Éligible à l'inscription
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Cette plateforme est réservée aux personnes majeures (18 ans et plus)
                  </p>
                )}
              </div>

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
                        <SelectItem value="érotique">Érotique</SelectItem>
                        <SelectItem value="glamour">Glamour</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        <SelectItem value="art">Art</SelectItem>
                        <SelectItem value="mode">Mode</SelectItem>
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
                        <SelectItem value="trans">Trans</SelectItem>
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
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || (signUpForm.password !== signUpForm.confirmPassword) || isMinor || !signUpForm.birthdate}
              >
                {isLoading ? 'Création...' : 'Créer un compte'}
              </Button>

              {/* Avertissement pour les mineurs */}
              {isMinor && (
                <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/30 text-center">
                  <p className="text-xs text-destructive font-medium">
                    L'inscription est impossible pour les personnes de moins de 18 ans.
                  </p>
                </div>
              )}
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
