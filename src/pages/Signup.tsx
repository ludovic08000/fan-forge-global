import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Sparkles, Heart, Music, Gamepad2, Gavel, Trophy, Dribbble, Dumbbell, ChefHat, Crown, Camera, Palette } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft, Mail, UserCircle, Video, CheckCircle, MailOpen } from 'lucide-react';
import { signUpSchema } from '@/lib/validations';
import { useRateLimitServer } from '@/hooks/useRateLimitServer';
import { toast } from 'sonner';
import { z } from 'zod';
import { PasswordRequirements } from '@/components/PasswordRequirements';

const Signup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { signUp, user } = useAuth();
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
    categories: [] as string[],
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

      // Pour les créateurs, utiliser le stageName comme username si pas de username
      const usernameToSend = validatedData.role === 'creator' 
        ? (validatedData.stageName || validatedData.username)
        : validatedData.username;

      const { error } = await signUp(
        validatedData.email,
        validatedData.password,
        validatedData.firstName,
        validatedData.lastName,
        usernameToSend,
        validatedData.role,
        validatedData.birthdate || undefined,
        validatedData.gender,
        validatedData.stageName,
        validatedData.category,
        validatedData.categories
      );
      
      if (!error) {
        // Afficher le message de succès - l'utilisateur doit cliquer sur le lien email
        setRegisteredEmail(validatedData.email);
        setSignupSuccess(true);
      } else {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('already') || msg.includes('registered')) {
          setSignUpErrors({ email: 'Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.' });
        }
      }
    } catch (error) {
      console.error('🔴 Erreur catch:', error);
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          console.error('🔴 Zod error:', err.path.join('.'), '-', err.message);
          const field = err.path[0] as string;
          if (field && !errors[field]) {
            errors[field] = err.message;
          }
        });
        console.error('🔴 All errors:', JSON.stringify(errors));
        setSignUpErrors(errors);
        const firstError = Object.values(errors)[0];
        toast.error(firstError || 'Veuillez corriger les erreurs du formulaire');
      }
    } finally {
      setIsLoading(false);
    }
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
            <CardTitle>{signupSuccess ? 'Vérifiez votre email' : 'Créer un compte'}</CardTitle>
            <CardDescription>
              {signupSuccess 
                ? 'Un email de confirmation vous a été envoyé'
                : 'Rejoignez notre communauté de créateurs et abonnés'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signupSuccess ? (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <MailOpen className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Compte créé avec succès !</h3>
                  <p className="text-muted-foreground">
                    Nous avons envoyé un email de confirmation à :
                  </p>
                  <p className="font-medium text-primary mt-1">{registeredEmail}</p>
                </div>

                <Alert className="border-green-500 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    <strong>Cliquez sur le lien dans l'email</strong> pour activer votre compte.
                    <br />
                    <span className="text-sm text-muted-foreground">
                      Vérifiez également vos spams si vous ne trouvez pas l'email.
                    </span>
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Une fois votre compte activé, vous pourrez vous connecter.
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/login">
                      Aller à la page de connexion
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
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

              {/* Date de naissance - commune aux deux rôles */}
              <div className="space-y-2">
                <Label htmlFor="birthdate-common">Date de naissance *</Label>
                <Input
                  id="birthdate-common"
                  type="date"
                  required
                  className={signUpErrors.birthdate ? 'border-destructive' : ''}
                  value={signUpForm.birthdate}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSignUpForm({ ...signUpForm, birthdate: e.target.value });
                    if (signUpErrors.birthdate) setSignUpErrors(prev => ({ ...prev, birthdate: '' }));
                  }}
                />
                {signUpErrors.birthdate ? (
                  <p className="text-xs text-destructive">{signUpErrors.birthdate}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Vous devez avoir au moins 18 ans
                  </p>
                )}
              </div>

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
                      className={signUpErrors.stageName ? 'border-destructive' : ''}
                      value={signUpForm.stageName}
                      onChange={(e) => {
                        setSignUpForm({ ...signUpForm, stageName: e.target.value });
                        if (signUpErrors.stageName) setSignUpErrors(prev => ({ ...prev, stageName: '' }));
                      }}
                    />
                    {signUpErrors.stageName ? (
                      <p className="text-xs text-destructive">{signUpErrors.stageName}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Ce nom sera visible publiquement
                      </p>
                    )}
                  </div>


                  <div className="space-y-3">
                    <Label>Catégories de contenu * <span className="text-xs text-muted-foreground font-normal">(3 max)</span></Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'Glamour', label: 'Glamour', icon: Sparkles, gradient: 'from-pink-500 to-rose-500' },
                        { id: 'Lifestyle', label: 'Lifestyle', icon: Heart, gradient: 'from-red-500 to-pink-500' },
                        { id: 'DJing', label: 'DJ', icon: Music, gradient: 'from-violet-500 to-purple-500' },
                        { id: 'Gaming', label: 'Gaming', icon: Gamepad2, gradient: 'from-emerald-500 to-green-500' },
                        { id: 'Avocat', label: 'Avocat', icon: Gavel, gradient: 'from-amber-500 to-yellow-500' },
                        { id: 'Football', label: 'Football', icon: Trophy, gradient: 'from-sky-500 to-blue-500' },
                        { id: 'Basketball', label: 'Basketball', icon: Dribbble, gradient: 'from-orange-500 to-amber-500' },
                        { id: 'Coach sportif', label: 'Coach', icon: Dumbbell, gradient: 'from-teal-500 to-cyan-500' },
                        { id: 'Cuisine', label: 'Cuisine', icon: ChefHat, gradient: 'from-rose-500 to-red-500' },
                        { id: 'Luxe', label: 'Luxe', icon: Crown, gradient: 'from-yellow-500 to-amber-400' },
                        { id: 'Mannequin', label: 'Mannequin', icon: Camera, gradient: 'from-indigo-500 to-violet-500' },
                        { id: 'Art & Création', label: 'Art', icon: Palette, gradient: 'from-fuchsia-500 to-pink-500' },
                      ].map((niche) => {
                        const Icon = niche.icon;
                        const isActive = signUpForm.categories.includes(niche.id);
                        const isDisabled = !isActive && signUpForm.categories.length >= 3;
                        return (
                          <button
                            key={niche.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              const cats = signUpForm.categories;
                              const newCats = isActive
                                ? cats.filter(c => c !== niche.id)
                                : [...cats, niche.id];
                              setSignUpForm({ 
                                ...signUpForm, 
                                categories: newCats,
                                category: newCats[0] || '' 
                              });
                            }}
                            className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[64px] ${
                              isActive
                                ? `bg-gradient-to-br ${niche.gradient} text-white shadow-lg ring-2 ring-primary/30`
                                : isDisabled
                                  ? 'bg-card border border-border/30 text-muted-foreground/40 cursor-not-allowed opacity-50'
                                  : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:shadow-md'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isActive ? 'bg-white/20' : `bg-gradient-to-br ${niche.gradient} text-white`
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="truncate w-full text-center">{niche.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {signUpErrors.category ? (
                      <p className="text-xs text-destructive">{signUpErrors.category}</p>
                    ) : signUpForm.categories.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {signUpForm.categories.length}/3 sélectionnée{signUpForm.categories.length > 1 ? 's' : ''}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Genre *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'femme', label: 'Femme' },
                        { value: 'homme', label: 'Homme' },
                        { value: 'non-binaire', label: 'Non-binaire' },
                        { value: 'autre', label: 'Autre' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSignUpForm({ ...signUpForm, gender: option.value });
                            if (signUpErrors.gender) setSignUpErrors(prev => ({ ...prev, gender: '' }));
                          }}
                          className={`p-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                            signUpForm.gender === option.value
                              ? 'border-primary bg-primary/10 text-primary shadow-sm'
                              : signUpErrors.gender
                                ? 'border-destructive text-muted-foreground'
                                : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {signUpErrors.gender && (
                      <p className="text-xs text-destructive">{signUpErrors.gender}</p>
                    )}
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
            )}

            {!signupSuccess && (
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Déjà un compte ?</span>{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
