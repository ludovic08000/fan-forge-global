import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cookie, Shield, Settings, X } from "lucide-react";
import { Link } from "react-router-dom";

interface CookiePreferences {
  essential: boolean; // Toujours true, ne peut pas être désactivé
  functional: boolean;
  analytics: boolean;
}

const COOKIE_CONSENT_KEY = "cookie_consent";
const COOKIE_PREFERENCES_KEY = "cookie_preferences";

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: true,
    analytics: false,
  });

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà donné son consentement
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Attendre un peu avant d'afficher la bannière pour une meilleure UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
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
    localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? "accepted" : "rejected");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setIsVisible(false);
    
    // Émettre un événement personnalisé pour que d'autres composants puissent réagir
    window.dispatchEvent(new CustomEvent("cookieConsentChanged", { 
      detail: { accepted, preferences: prefs } 
    }));
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
    };
    setPreferences(allAccepted);
    saveConsent(true, allAccepted);
  };

  const handleAcceptEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
    };
    setPreferences(essentialOnly);
    saveConsent(true, essentialOnly);
  };

  const handleSavePreferences = () => {
    saveConsent(true, preferences);
  };

  const handleRejectAll = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
    };
    setPreferences(essentialOnly);
    saveConsent(false, essentialOnly);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl bg-card border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Gestion des cookies</h2>
                <p className="text-sm text-muted-foreground">Site réservé aux adultes (18+)</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRejectAll}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Description */}
          <p className="text-muted-foreground mb-6">
            Nous utilisons des cookies pour assurer le bon fonctionnement du site, 
            sécuriser vos paiements et mémoriser vos préférences. 
            Les cookies essentiels (authentification, vérification d'âge, sécurité) sont obligatoires.
          </p>

          {/* Détails des cookies */}
          {showDetails && (
            <div className="space-y-4 mb-6 p-4 bg-muted/30 rounded-lg animate-in slide-in-from-top-2 duration-300">
              {/* Cookies essentiels */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-500" />
                  <div>
                    <Label className="font-medium">Cookies essentiels</Label>
                    <p className="text-xs text-muted-foreground">
                      Authentification, vérification d'âge, sécurité, paiements Stripe
                    </p>
                  </div>
                </div>
                <Switch checked={true} disabled />
              </div>

              {/* Cookies fonctionnels */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-blue-500" />
                  <div>
                    <Label className="font-medium">Cookies fonctionnels</Label>
                    <p className="text-xs text-muted-foreground">
                      Thème, langue, préférences d'affichage
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
                  <Cookie className="h-5 w-5 text-orange-500" />
                  <div>
                    <Label className="font-medium">Cookies analytiques</Label>
                    <p className="text-xs text-muted-foreground">
                      Statistiques anonymes pour améliorer le site (désactivés par défaut)
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

          {/* Lien vers politique */}
          <p className="text-sm text-muted-foreground mb-6">
            En savoir plus dans notre{" "}
            <Link to="/cookies" className="text-primary hover:underline">
              Politique des cookies
            </Link>
            {" "}et notre{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Politique de confidentialité
            </Link>.
          </p>

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDetails(!showDetails)}
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              {showDetails ? "Masquer les détails" : "Personnaliser"}
            </Button>
            
            {showDetails ? (
              <Button 
                onClick={handleSavePreferences}
                className="flex-1"
              >
                Sauvegarder mes choix
              </Button>
            ) : (
              <>
                <Button 
                  variant="secondary" 
                  onClick={handleAcceptEssential}
                  className="flex-1"
                >
                  Essentiels uniquement
                </Button>
                <Button 
                  onClick={handleAcceptAll}
                  className="flex-1"
                >
                  Tout accepter
                </Button>
              </>
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

  useEffect(() => {
    const checkConsent = () => {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      const prefs = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      
      setHasConsent(consent === "accepted");
      if (prefs) {
        setPreferences(JSON.parse(prefs));
      }
    };

    checkConsent();

    // Écouter les changements de consentement
    const handleConsentChange = () => checkConsent();
    window.addEventListener("cookieConsentChanged", handleConsentChange);
    
    return () => {
      window.removeEventListener("cookieConsentChanged", handleConsentChange);
    };
  }, []);

  const resetConsent = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(COOKIE_PREFERENCES_KEY);
    setHasConsent(null);
    setPreferences(null);
    window.location.reload();
  };

  return { hasConsent, preferences, resetConsent };
};

export default CookieConsent;
