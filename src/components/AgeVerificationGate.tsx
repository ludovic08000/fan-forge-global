import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, ShieldAlert, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdultAccess } from "@/hooks/useAdultAccess";
import { Link } from "react-router-dom";

const AGE_VERIFICATION_KEY = "age-verified";
const VERIFICATION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 jours

// Catégories qui nécessitent une vérification d'âge
const ADULT_CATEGORIES = ["charme", "erotique", "adult", "sensuel", "glamour"];

interface AgeVerificationGateProps {
  children: React.ReactNode;
  category?: string | null;
  contentType?: string[] | null;
}

// Hook pour vérifier si l'âge a été vérifié
export const useAgeVerification = () => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const storedVerification = localStorage.getItem(AGE_VERIFICATION_KEY);
    
    if (storedVerification) {
      const { timestamp, verified } = JSON.parse(storedVerification);
      const isExpired = Date.now() - timestamp > VERIFICATION_DURATION;
      
      if (!isExpired && verified) {
        setIsVerified(true);
      } else {
        localStorage.removeItem(AGE_VERIFICATION_KEY);
        setIsVerified(false);
      }
    } else {
      setIsVerified(false);
    }
  }, []);

  const verifyAge = () => {
    localStorage.setItem(
      AGE_VERIFICATION_KEY,
      JSON.stringify({ verified: true, timestamp: Date.now() })
    );
    setIsVerified(true);
  };

  return { isVerified, verifyAge };
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

    // Fallback: vérification localStorage pour les non-connectés ou sans date de naissance
    const storedVerification = localStorage.getItem(AGE_VERIFICATION_KEY);
    
    if (storedVerification) {
      const { timestamp, verified } = JSON.parse(storedVerification);
      const isExpired = Date.now() - timestamp > VERIFICATION_DURATION;
      
      if (!isExpired && verified) {
        setIsVerified(true);
      } else {
        localStorage.removeItem(AGE_VERIFICATION_KEY);
        setIsVerified(false);
      }
    } else {
      setIsVerified(false);
    }
    
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
              Accès interdit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <CardDescription className="text-center text-base leading-relaxed">
              Vous avez {age} ans. Ce contenu est strictement réservé aux personnes majeures (18 ans et plus).
              Selon votre date de naissance enregistrée, vous n'êtes pas autorisé(e) à accéder à cette section.
            </CardDescription>

            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/30">
              <p className="text-sm text-muted-foreground text-center">
                Cette restriction est automatique et basée sur votre profil. 
                Si vous pensez qu'il s'agit d'une erreur, vérifiez votre date de naissance dans vos paramètres.
              </p>
            </div>

            <div className="space-y-3">
              <Link to="/profile">
                <Button variant="outline" className="w-full">
                  Vérifier mon profil
                </Button>
              </Link>
              <Link to="/">
                <Button className="w-full">
                  Retour à l'accueil
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
              Contenu réservé aux adultes
            </CardTitle>
            <div className="flex items-center justify-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <span className="font-semibold">Section Charme / Érotique</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <CardDescription className="text-center text-base leading-relaxed">
              Ce créateur propose du contenu pour adultes (charme/érotique).
              Vous devez confirmer avoir l'âge légal (18 ans ou plus) pour accéder à cette page.
            </CardDescription>

            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground text-center">
                En cliquant sur "J'ai 18 ans ou plus", vous confirmez être majeur et acceptez nos{" "}
                <a href="/terms" className="text-primary hover:underline">
                  Conditions d'Utilisation
                </a>
                .
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => handleVerification(true)}
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-lg py-6"
              >
                J'ai 18 ans ou plus
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleVerification(false)}
                className="w-full py-6"
              >
                Je suis mineur - Quitter
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
