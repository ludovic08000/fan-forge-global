import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, ShieldAlert } from "lucide-react";

const AGE_VERIFICATION_KEY = "age-verified";
const VERIFICATION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 jours

const AgeVerificationGate = ({ children }: { children: React.ReactNode }) => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAgeVerification();
  }, []);

  const checkAgeVerification = () => {
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
  };

  const handleVerification = (isAdult: boolean) => {
    if (isAdult) {
      localStorage.setItem(
        AGE_VERIFICATION_KEY,
        JSON.stringify({ verified: true, timestamp: Date.now() })
      );
      setIsVerified(true);
    } else {
      // Rediriger vers Google si l'utilisateur n'est pas majeur
      window.location.href = "https://www.google.com";
    }
  };

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
              CreatorHub
            </CardTitle>
            <div className="flex items-center justify-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <span className="font-semibold">Contenu réservé aux adultes</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <CardDescription className="text-center text-base leading-relaxed">
              Ce site contient du contenu réservé aux personnes majeures (18 ans et plus).
              En accédant à ce site, vous confirmez avoir l'âge légal requis dans votre pays de résidence.
            </CardDescription>

            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground text-center">
                En cliquant sur "J'ai 18 ans ou plus", vous acceptez nos{" "}
                <a href="/terms" className="text-primary hover:underline">
                  Conditions d'Utilisation
                </a>{" "}
                et notre{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  Politique de Confidentialité
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
                Je suis mineur - Quitter le site
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Conformément à la loi française, l'accès à ce site est interdit aux mineurs.
              Toute personne accédant à ce site déclare être majeure.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si vérifié, afficher le contenu normal
  return <>{children}</>;
};

export default AgeVerificationGate;
