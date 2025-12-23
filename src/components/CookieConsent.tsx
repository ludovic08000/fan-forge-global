import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Cookie, Shield, Settings, X, AlertTriangle, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
}

const COOKIE_CONSENT_KEY = "cookie_consent";
const COOKIE_PREFERENCES_KEY = "cookie_preferences";
const AGE_VERIFICATION_KEY = "age-verified";
const VERIFICATION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 jours

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: true,
    analytics: false,
  });

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà donné son consentement ET vérifié son âge
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const ageVerification = localStorage.getItem(AGE_VERIFICATION_KEY);
    
    let ageIsVerified = false;
    if (ageVerification) {
      try {
        const { timestamp, verified } = JSON.parse(ageVerification);
        const isExpired = Date.now() - timestamp > VERIFICATION_DURATION;
        ageIsVerified = !isExpired && verified;
      } catch {
        ageIsVerified = false;
      }
    }

    if (!consent || !ageIsVerified) {
      // Attendre un peu avant d'afficher la bannière pour une meilleure UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Charger les préférences existantes
      const savedPrefs = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
    }
  }, []);

  const saveConsent = (accepted: boolean, prefs: CookiePreferences) => {
    // Sauvegarder le consentement cookies
    localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? "accepted" : "rejected");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    
    // Sauvegarder la vérification d'âge
    localStorage.setItem(
      AGE_VERIFICATION_KEY,
      JSON.stringify({ verified: true, timestamp: Date.now() })
    );
    
    setIsVisible(false);
    
    // Émettre un événement personnalisé
    window.dispatchEvent(new CustomEvent("cookieConsentChanged", { 
      detail: { accepted, preferences: prefs, ageVerified: true } 
    }));
  };

  const handleAcceptAll = () => {
    if (!ageConfirmed) return;
    const allAccepted: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
    };
    setPreferences(allAccepted);
    saveConsent(true, allAccepted);
  };

  const handleAcceptEssential = () => {
    if (!ageConfirmed) return;
    const essentialOnly: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
    };
    setPreferences(essentialOnly);
    saveConsent(true, essentialOnly);
  };

  const handleSavePreferences = () => {
    if (!ageConfirmed) return;
    saveConsent(true, preferences);
  };

  const handleLeave = () => {
    // Rediriger vers Google si l'utilisateur refuse ou est mineur
    window.location.href = "https://www.google.com";
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl bg-card border-border shadow-2xl animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header avec avertissement adulte */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/20">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Site réservé aux adultes</h2>
                <p className="text-sm text-muted-foreground">Vérification d'âge et cookies</p>
              </div>
            </div>
          </div>

          {/* Avertissement adulte */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-destructive">
                  ⚠️ CONTENU EXPLICITE POUR ADULTES
                </p>
                <p className="text-sm text-muted-foreground">
                  Ce site contient du contenu à caractère sexuel explicite réservé exclusivement 
                  aux personnes majeures (18 ans et plus). En poursuivant, vous certifiez sur l'honneur 
                  avoir l'âge légal requis dans votre pays.
                </p>
                <p className="text-sm font-medium text-destructive">
                  L'accès à ce site est strictement interdit aux mineurs.
                </p>
              </div>
            </div>
          </div>

          {/* Case à cocher vérification d'âge */}
          <div className="bg-muted/30 rounded-lg p-4 mb-6 border border-border">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="age-verification"
                checked={ageConfirmed}
                onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label 
                  htmlFor="age-verification" 
                  className="text-base font-semibold cursor-pointer"
                >
                  Je certifie avoir 18 ans ou plus
                </Label>
                <p className="text-sm text-muted-foreground">
                  Je confirme être majeur(e) et accepter de voir du contenu pour adultes. 
                  Je comprends que ce site utilise des cookies essentiels pour la vérification d'âge, 
                  l'authentification et la sécurité des paiements.
                </p>
              </div>
            </div>
          </div>

          {/* Section Cookies */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Cookie className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Gestion des cookies</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Nous utilisons des cookies pour assurer le bon fonctionnement du site, 
              sécuriser vos paiements et mémoriser vos préférences.
            </p>

            {/* Détails des cookies */}
            {showDetails && (
              <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-border animate-in slide-in-from-top-2 duration-300 mb-4">
                {/* Cookies essentiels */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-green-500" />
                    <div>
                      <Label className="font-medium text-sm">Essentiels (obligatoires)</Label>
                      <p className="text-xs text-muted-foreground">
                        Authentification, vérification d'âge, sécurité, Stripe
                      </p>
                    </div>
                  </div>
                  <Switch checked={true} disabled />
                </div>

                {/* Cookies fonctionnels */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 text-blue-500" />
                    <div>
                      <Label className="font-medium text-sm">Fonctionnels</Label>
                      <p className="text-xs text-muted-foreground">
                        Thème, langue, préférences
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.functional}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, functional: checked }))}
                  />
                </div>

                {/* Cookies analytiques */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cookie className="h-4 w-4 text-orange-500" />
                    <div>
                      <Label className="font-medium text-sm">Analytiques</Label>
                      <p className="text-xs text-muted-foreground">
                        Statistiques anonymes (désactivés par défaut)
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.analytics}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, analytics: checked }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Liens légaux */}
          <p className="text-xs text-muted-foreground mb-6">
            En continuant, vous acceptez nos{" "}
            <Link to="/terms" className="text-primary hover:underline">CGU</Link>,{" "}
            <Link to="/privacy" className="text-primary hover:underline">Politique de confidentialité</Link> et{" "}
            <Link to="/cookies" className="text-primary hover:underline">Politique des cookies</Link>.
          </p>

          {/* Boutons */}
          <div className="flex flex-col gap-3">
            {/* Ligne de personnalisation */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="self-start text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4 mr-2" />
              {showDetails ? "Masquer les options cookies" : "Personnaliser les cookies"}
            </Button>

            {/* Boutons principaux */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={handleLeave}
                className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Je suis mineur - Quitter
              </Button>

              {showDetails ? (
                <Button 
                  onClick={handleSavePreferences}
                  disabled={!ageConfirmed}
                  className="flex-1"
                >
                  Sauvegarder mes choix
                </Button>
              ) : (
                <>
                  <Button 
                    variant="secondary" 
                    onClick={handleAcceptEssential}
                    disabled={!ageConfirmed}
                    className="flex-1"
                  >
                    Essentiels uniquement
                  </Button>
                  <Button 
                    onClick={handleAcceptAll}
                    disabled={!ageConfirmed}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    J'ai 18+ ans - Tout accepter
                  </Button>
                </>
              )}
            </div>

            {!ageConfirmed && (
              <p className="text-xs text-center text-amber-500">
                ⚠️ Vous devez cocher la case de vérification d'âge pour continuer
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

// Hook pour accéder aux préférences de cookies
export const useCookieConsent = () => {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [ageVerified, setAgeVerified] = useState<boolean>(false);

  useEffect(() => {
    const checkConsent = () => {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      const prefs = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      const ageVerification = localStorage.getItem(AGE_VERIFICATION_KEY);
      
      setHasConsent(consent === "accepted");
      if (prefs) {
        setPreferences(JSON.parse(prefs));
      }
      
      if (ageVerification) {
        try {
          const { timestamp, verified } = JSON.parse(ageVerification);
          const isExpired = Date.now() - timestamp > VERIFICATION_DURATION;
          setAgeVerified(!isExpired && verified);
        } catch {
          setAgeVerified(false);
        }
      }
    };

    checkConsent();

    const handleConsentChange = () => checkConsent();
    window.addEventListener("cookieConsentChanged", handleConsentChange);
    
    return () => {
      window.removeEventListener("cookieConsentChanged", handleConsentChange);
    };
  }, []);

  const resetConsent = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(COOKIE_PREFERENCES_KEY);
    localStorage.removeItem(AGE_VERIFICATION_KEY);
    setHasConsent(null);
    setPreferences(null);
    setAgeVerified(false);
    window.location.reload();
  };

  return { hasConsent, preferences, ageVerified, resetConsent };
};

export default CookieConsent;
