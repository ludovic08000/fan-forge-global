import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, ShieldAlert, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdultAccess } from "@/hooks/useAdultAccess";
import { Link } from "react-router-dom";
import { useTranslation } from "@/contexts/TranslationContext";

// Age verification now requires authentication + birthdate in DB
// No localStorage fallback to prevent bypass

// Catégories qui nécessitent une vérification d'âge
const ADULT_CATEGORIES = ["charme", "erotique", "adult", "sensuel", "glamour"];

interface AgeVerificationGateProps {
  children: React.ReactNode;
  category?: string | null;
  contentType?: string[] | null;
}

// Hook pour vérifier si l'âge a été vérifié (server-side only)
export const useAgeVerification = () => {
  const { user } = useAuth();
  const { isUserAdult, isLoading: isLoadingAge, hasBirthdate } = useAdultAccess();
  
  const isVerified = user && hasBirthdate && isUserAdult === true;

  return { 
    isVerified: isVerified ?? false, 
    verifyAge: () => {}, // No-op: verification is server-side only
    isLoading: isLoadingAge 
  };
};

// Fonction pour vérifier si une catégorie nécessite une vérification d'âge
export const requiresAgeVerification = (category?: string | null, contentType?: string[] | null): boolean => {
  if (category) {
    const normalizedCategory = category.toLowerCase().trim();
    if (ADULT_CATEGORIES.some(adult => normalizedCategory.includes(adult))) {
      return true;
    }
  }
  
  if (contentType && Array.isArray(contentType)) {
    return contentType.some(type => 
      ADULT_CATEGORIES.some(adult => type.toLowerCase().includes(adult))
    );
  }
  
  return false;
};

const AgeVerificationGate = ({ children, category, contentType }: AgeVerificationGateProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdult: isUserAdult, isLoading: isLoadingAge, hasBirthdate, age } = useAdultAccess();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Vérifier si ce contenu nécessite une vérification d'âge
  const needsVerification = requiresAgeVerification(category, contentType);

  useEffect(() => {
    if (!needsVerification) {
      setIsVerified(true);
      setIsChecking(false);
      return;
    }

    // Si l'utilisateur est connecté et a une date de naissance
    if (user && !isLoadingAge) {
      if (hasBirthdate) {
        // Vérification basée sur la date de naissance en base
        setIsVerified(isUserAdult === true);
        setIsChecking(false);
        return;
      }
    }

    // Utilisateur non connecté ou sans date de naissance → forcer la connexion
    // Pas de fallback localStorage pour éviter le contournement
    setIsVerified(false);
    setIsChecking(false);
  }, [needsVerification, user, isUserAdult, isLoadingAge, hasBirthdate]);

  const handleVerification = (isAdult: boolean) => {
    if (isAdult) {
      localStorage.setItem(
        AGE_VERIFICATION_KEY,
        JSON.stringify({ verified: true, timestamp: Date.now() })
      );
      setIsVerified(true);
    } else {
      window.location.href = "https://www.google.com";
    }
  };

  // Si utilisateur connecté et mineur (date de naissance vérifiée)
  if (needsVerification && user && hasBirthdate && isUserAdult === false && !isLoadingAge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-destructive/20 p-4 rounded-2xl w-fit">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
             <CardTitle className="text-2xl font-bold text-destructive">
               {t('ageVerification.accessDenied')}
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-6">
             <CardDescription className="text-center text-base leading-relaxed">
               {t('ageVerification.youAre')} {age} {t('ageVerification.yearsOld')}. {t('ageVerification.adultContentRestricted')}
             </CardDescription>

             <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/30">
               <p className="text-sm text-muted-foreground text-center">
                 {t('ageVerification.restrictionAutomatic')}
               </p>
             </div>

             <div className="space-y-3">
               <Link to="/profile">
                 <Button variant="outline" className="w-full">
                   {t('ageVerification.checkProfile')}
                 </Button>
               </Link>
               <Link to="/">
                 <Button className="w-full">
                   {t('ageVerification.backToHome')}
                 </Button>
               </Link>
             </div>

           </CardContent>
         </Card>
      </div>
    );
  }

  // Si pas besoin de vérification, afficher le contenu
  if (!needsVerification) {
    return <>{children}</>;
  }

  // Pendant la vérification, ne rien afficher
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si non vérifié, afficher la porte d'âge
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-gradient-to-r from-primary via-primary-glow to-primary p-4 rounded-2xl w-fit">
              <Crown className="h-12 w-12 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {t('ageVerification.adultContent')}
            </CardTitle>
            <div className="flex items-center justify-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <span className="font-semibold">{t('ageVerification.adultSection')}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <CardDescription className="text-center text-base leading-relaxed">
              {t('ageVerification.adultContentDescription')}
            </CardDescription>

            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground text-center">
                {t('ageVerification.confirmAge')}{" "}
                <a href="/terms" className="text-primary hover:underline">
                  {t('ageVerification.termsOfService')}
                </a>
                .
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => handleVerification(true)}
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-lg py-6"
              >
                {t('ageVerification.iAmAdult')}
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleVerification(false)}
                className="w-full py-6"
              >
                {t('ageVerification.iAmMinor')}
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AgeVerificationGate;
