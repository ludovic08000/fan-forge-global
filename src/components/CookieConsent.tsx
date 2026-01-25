import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Cookie, Shield, Settings, X, ShieldCheck, BarChart3, Fingerprint } from "lucide-react";
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
  ageVerified: boolean;
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
  const [ageConfirmed, setAgeConfirmed] = useState(false);
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
          if (now < expiresAt && record.version === CONSENT_VERSION && record.ageVerified) {
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
      ageVerified: true,
      expiresAt: expiresAt.toISOString(),
      userAgent: navigator.userAgent,
    };
    
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentRecord));
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    
    setIsVisible(false);
    
    // Émettre un événement pour les autres composants
    window.dispatchEvent(new CustomEvent("cookieConsentChanged", { 
      detail: { preferences: prefs, ageVerified: true, timestamp: now.toISOString() } 
    }));
  };

  const handleAcceptAll = () => {
    if (!ageConfirmed) return;
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
    if (!ageConfirmed) return;
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
    if (!ageConfirmed) return;
    saveConsent(preferences);
  };

  const handleLeave = () => {
    window.location.href = "https://www.google.com";
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl bg-card border-border shadow-2xl animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Gestion des cookies et données</h2>
                <p className="text-sm text-muted-foreground">Conforme RGPD / Loi française</p>
              </div>
            </div>
          </div>

          {/* Info RGPD */}
          <div className="bg-muted/30 border border-border rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold">
                  Protection de vos données personnelles
                </p>
                <p className="text-sm text-muted-foreground">
                  Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi 
                  française Informatique et Libertés, nous vous informons de l'utilisation de cookies 
                  et technologies similaires sur notre site.
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
                  Je confirme être majeur(e) et comprends que ce site utilise des cookies 
                  pour son fonctionnement.
                </p>
              </div>
            </div>
          </div>

          {/* Section Cookies - Toujours visible */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Types de cookies utilisés</h3>
            </div>

            {/* Détails des cookies */}
            {showDetails ? (
              <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border animate-in slide-in-from-top-2 duration-300 mb-4">
                {/* Cookies essentiels */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-4 w-4 text-green-500 mt-1" />
                    <div>
                      <Label className="font-medium text-sm">Cookies essentiels (obligatoires)</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Authentification, session utilisateur, sécurité, paiements Stripe. 
                        Ces cookies sont nécessaires au fonctionnement du site.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Données collectées:</strong> Identifiant de session, token d'authentification
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Durée:</strong> Session / 30 jours max
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
                        Thème (clair/sombre), langue préférée, préférences d'affichage.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Données collectées:</strong> Préférences utilisateur
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
                        Statistiques anonymes pour améliorer notre service (Sentry pour les erreurs).
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Données collectées:</strong> Pages visitées, erreurs techniques (anonymisées)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Durée:</strong> 13 mois max
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
                      <Label className="font-medium text-sm">Cookies publicitaires / marketing</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Personnalisation des recommandations, retargeting publicitaire.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Données collectées:</strong> Préférences de contenu, historique de navigation
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Durée:</strong> 13 mois max
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.marketing}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketing: checked }))}
                  />
                </div>

                {/* Info droits RGPD */}
                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-xs text-muted-foreground">
                    <strong>Vos droits RGPD:</strong> Vous pouvez à tout moment modifier vos préférences, 
                    accéder à vos données, les rectifier ou demander leur suppression en nous contactant 
                    ou via vos paramètres de compte.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                Nous utilisons des cookies essentiels (session, sécurité) et optionnels (préférences, statistiques). 
                Vous pouvez personnaliser vos choix ci-dessous.
              </p>
            )}
          </div>

          {/* Liens légaux */}
          <p className="text-xs text-muted-foreground mb-6">
            En continuant, vous acceptez nos{" "}
            <Link to="/terms" className="text-primary hover:underline">CGU</Link>,{" "}
            <Link to="/privacy" className="text-primary hover:underline">Politique de confidentialité</Link> et{" "}
            <Link to="/cookies" className="text-primary hover:underline">Politique des cookies</Link>.
            {" "}Votre consentement est conservé {CONSENT_DURATION_DAYS} jours.
          </p>

          {/* Boutons */}
          <div className="flex flex-col gap-3">
            {/* Personnalisation cookies */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="self-start text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4 mr-2" />
              {showDetails ? "Masquer les détails" : "Personnaliser mes choix"}
            </Button>

            {/* Boutons principaux */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={handleLeave}
                className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Quitter le site
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
                    Tout accepter
                  </Button>
                </>
              )}
            </div>

            {!ageConfirmed && (
              <p className="text-xs text-center text-amber-500">
                ⚠️ Veuillez cocher la case de vérification d'âge pour continuer
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
          
          if (now < expiresAt && record.version === CONSENT_VERSION && record.ageVerified) {
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
