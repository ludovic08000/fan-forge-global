import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cookie, Shield, Settings, ShieldCheck, BarChart3, Fingerprint } from "lucide-react";
import { Link } from "react-router-dom";

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface ConsentRecord {
  version: string;
  timestamp: string;
  preferences: CookiePreferences;
  expiresAt: string;
  userAgent: string;
}

const COOKIE_CONSENT_KEY = "rgpd_cookie_consent";
const COOKIE_PREFERENCES_KEY = "rgpd_cookie_preferences";
const CONSENT_VERSION = "1.0";
const CONSENT_DURATION_DAYS = 365; // Durée légale max recommandée: 13 mois
const CONSENT_DURATION_MS = CONSENT_DURATION_DAYS * 24 * 60 * 60 * 1000;

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const checkExistingConsent = () => {
      const consentRecord = localStorage.getItem(COOKIE_CONSENT_KEY);
      
      if (consentRecord) {
        try {
          const record: ConsentRecord = JSON.parse(consentRecord);
          const expiresAt = new Date(record.expiresAt);
          const now = new Date();
          
          // Vérifier expiration et version
          if (now < expiresAt && record.version === CONSENT_VERSION) {
            // Consentement valide
            const savedPrefs = localStorage.getItem(COOKIE_PREFERENCES_KEY);
            if (savedPrefs) {
              setPreferences(JSON.parse(savedPrefs));
            }
            return;
          }
        } catch {
          // Consentement invalide, le redemander
        }
      }
      
      // Afficher la bannière avec délai pour UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    };

    checkExistingConsent();
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONSENT_DURATION_MS);
    
    // Enregistrement de consentement conforme RGPD
    const consentRecord: ConsentRecord = {
      version: CONSENT_VERSION,
      timestamp: now.toISOString(),
      preferences: prefs,
      expiresAt: expiresAt.toISOString(),
      userAgent: navigator.userAgent,
    };
    
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentRecord));
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    
    setIsVisible(false);
    
    // Émettre un événement pour les autres composants
    window.dispatchEvent(new CustomEvent("cookieConsentChanged", { 
      detail: { preferences: prefs, timestamp: now.toISOString() } 
    }));
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const handleAcceptEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setPreferences(essentialOnly);
    saveConsent(essentialOnly);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom duration-300">
      <Card className="max-w-4xl mx-auto bg-card border-border shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 rounded-full bg-primary/20 shrink-0">
              <Cookie className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold">Gestion des cookies</h2>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">RGPD / UE</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez personnaliser vos préférences ci-dessous.
              </p>
            </div>
          </div>

          {/* Détails des cookies */}
          {showDetails && (
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border animate-in slide-in-from-top-2 duration-300 mb-4">
              {/* Cookies essentiels */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-green-500 mt-1" />
                  <div>
                    <Label className="font-medium text-sm">Cookies essentiels (obligatoires)</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Authentification, session, sécurité, paiements. Nécessaires au fonctionnement du site.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Durée:</strong> Session / 30 jours
                    </p>
                  </div>
                </div>
                <Switch checked={true} disabled />
              </div>

              {/* Cookies fonctionnels */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Settings className="h-4 w-4 text-blue-500 mt-1" />
                  <div>
                    <Label className="font-medium text-sm">Cookies fonctionnels</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Thème (clair/sombre), langue, préférences d'affichage.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Durée:</strong> 1 an
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.functional}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, functional: checked }))}
                />
              </div>

              {/* Cookies analytiques */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-4 w-4 text-orange-500 mt-1" />
                  <div>
                    <Label className="font-medium text-sm">Cookies analytiques</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Statistiques anonymes pour améliorer le service.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Durée:</strong> 13 mois
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.analytics}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, analytics: checked }))}
                />
              </div>

              {/* Cookies marketing */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Fingerprint className="h-4 w-4 text-purple-500 mt-1" />
                  <div>
                    <Label className="font-medium text-sm">Cookies publicitaires</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Personnalisation des recommandations de contenu.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Durée:</strong> 13 mois
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.marketing}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketing: checked }))}
                />
              </div>

              {/* Info droits RGPD */}
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Vos droits:</strong> Vous pouvez modifier vos préférences, accéder à vos données 
                    ou demander leur suppression à tout moment via vos paramètres de compte.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Liens légaux et boutons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/cookies" className="text-primary hover:underline">Politique cookies</Link>
              <Link to="/privacy" className="text-primary hover:underline">Confidentialité</Link>
              <span>Consentement valide {CONSENT_DURATION_DAYS} jours</span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4 mr-2" />
                {showDetails ? "Masquer" : "Personnaliser"}
              </Button>

              {showDetails ? (
                <Button onClick={handleSavePreferences} size="sm">
                  Sauvegarder
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleAcceptEssential}
                    size="sm"
                  >
                    Refuser optionnels
                  </Button>
                  <Button 
                    onClick={handleAcceptAll}
                    size="sm"
                  >
                    Tout accepter
                  </Button>
                </>
              )}
            </div>
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
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);

  useEffect(() => {
    const checkConsent = () => {
      const consentRecord = localStorage.getItem(COOKIE_CONSENT_KEY);
      const prefs = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      
      if (consentRecord) {
        try {
          const record: ConsentRecord = JSON.parse(consentRecord);
          const expiresAt = new Date(record.expiresAt);
          const now = new Date();
          
          if (now < expiresAt && record.version === CONSENT_VERSION) {
            setHasConsent(true);
            setConsentTimestamp(record.timestamp);
            if (prefs) {
              setPreferences(JSON.parse(prefs));
            }
            return;
          }
        } catch {
          // Invalid record
        }
      }
      
      setHasConsent(false);
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
    setHasConsent(null);
    setPreferences(null);
    setConsentTimestamp(null);
    window.location.reload();
  };

  return { hasConsent, preferences, consentTimestamp, resetConsent };
};

export default CookieConsent;
