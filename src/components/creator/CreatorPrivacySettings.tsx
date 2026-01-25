import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Globe, Users, MapPin, Shield, Save, Loader2, X, Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { Language } from '@/hooks/useLanguageDetection';

// Liste des pays européens + principaux pays
const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'ES', name: 'Espagne' },
  { code: 'IT', name: 'Italie' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
  { code: 'NL', name: 'Pays-Bas' },
  { code: 'PT', name: 'Portugal' },
  { code: 'AT', name: 'Autriche' },
  { code: 'PL', name: 'Pologne' },
  { code: 'US', name: 'États-Unis' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australie' },
  { code: 'JP', name: 'Japon' },
  { code: 'BR', name: 'Brésil' },
  { code: 'RU', name: 'Russie' },
  { code: 'CN', name: 'Chine' },
  { code: 'IN', name: 'Inde' },
  { code: 'MX', name: 'Mexique' },
];

// Langues disponibles avec leurs noms natifs
const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
];

interface CreatorPrivacySettingsProps {
  creatorId: string;
}

const CreatorPrivacySettings: React.FC<CreatorPrivacySettingsProps> = ({ creatorId }) => {
  const { changeLanguage } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hideFromSearchEngines, setHideFromSearchEngines] = useState(false);
  const [hideSubscriberCount, setHideSubscriberCount] = useState(false);
  const [blockedCountries, setBlockedCountries] = useState<string[]>([]);
  const [preferredLanguage, setPreferredLanguage] = useState('fr');
  const [showCountrySelector, setShowCountrySelector] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [creatorId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('creators')
        .select('hide_from_search_engines, hide_subscriber_count, blocked_countries, preferred_language')
        .eq('id', creatorId)
        .single();

      if (error) throw error;

      setHideFromSearchEngines(data?.hide_from_search_engines || false);
      setHideSubscriberCount(data?.hide_subscriber_count || false);
      setBlockedCountries(data?.blocked_countries || []);
      setPreferredLanguage(data?.preferred_language || 'fr');
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setPreferredLanguage(newLanguage);
    // Appliquer immédiatement la traduction
    changeLanguage(newLanguage as Language);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('creators')
        .update({
          hide_from_search_engines: hideFromSearchEngines,
          hide_subscriber_count: hideSubscriberCount,
          blocked_countries: blockedCountries,
          preferred_language: preferredLanguage,
        })
        .eq('id', creatorId);

      if (error) throw error;

      // Persister la langue dans localStorage
      localStorage.setItem('preferred-language', preferredLanguage);

      toast.success('Paramètres de confidentialité enregistrés');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const toggleCountry = (countryCode: string) => {
    setBlockedCountries(prev => 
      prev.includes(countryCode) 
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  const removeCountry = (countryCode: string) => {
    setBlockedCountries(prev => prev.filter(c => c !== countryCode));
  };

  const getCountryName = (code: string) => {
    return COUNTRIES.find(c => c.code === code)?.name || code;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Confidentialité & Langue</CardTitle>
        </div>
        <CardDescription>
          Contrôlez la visibilité de votre profil et la langue du site
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Selection */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-background">
              <Languages className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <Label className="font-medium">Langue du site</Label>
              <p className="text-sm text-muted-foreground">
                Choisissez votre langue préférée pour l'interface
              </p>
            </div>
          </div>
          <Select value={preferredLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {LANGUAGES.find(l => l.code === preferredLanguage)?.flag}{' '}
                {LANGUAGES.find(l => l.code === preferredLanguage)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Hide from Search Engines */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-background">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <Label htmlFor="hide-seo" className="font-medium">
                Masquer sur Google
              </Label>
              <p className="text-sm text-muted-foreground">
                Votre profil n'apparaîtra pas dans les résultats de recherche
              </p>
            </div>
          </div>
          <Switch
            id="hide-seo"
            checked={hideFromSearchEngines}
            onCheckedChange={setHideFromSearchEngines}
          />
        </div>

        {/* Hide Subscriber Count */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-background">
              {hideSubscriberCount ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Users className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label htmlFor="hide-subs" className="font-medium">
                Masquer le nombre d'abonnés
              </Label>
              <p className="text-sm text-muted-foreground">
                Le compteur d'abonnés sera caché sur votre profil public
              </p>
            </div>
          </div>
          <Switch
            id="hide-subs"
            checked={hideSubscriberCount}
            onCheckedChange={setHideSubscriberCount}
          />
        </div>

        {/* Blocked Countries */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-background">
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <Label className="font-medium">Bloquer des pays</Label>
              <p className="text-sm text-muted-foreground">
                Les visiteurs de ces pays ne pourront pas voir votre profil
              </p>
            </div>
          </div>

          {/* Selected Countries */}
          {blockedCountries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {blockedCountries.map(code => (
                <Badge 
                  key={code} 
                  variant="secondary"
                  className="pl-2 pr-1 py-1 flex items-center gap-1"
                >
                  {getCountryName(code)}
                  <button 
                    onClick={() => removeCountry(code)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Country Selector */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCountrySelector(!showCountrySelector)}
          >
            {showCountrySelector ? 'Fermer' : 'Ajouter des pays'}
          </Button>

          {showCountrySelector && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 max-h-48 overflow-y-auto p-2 border rounded-lg bg-background">
              {COUNTRIES.map(country => (
                <div key={country.code} className="flex items-center space-x-2">
                  <Checkbox
                    id={`country-${country.code}`}
                    checked={blockedCountries.includes(country.code)}
                    onCheckedChange={() => toggleCountry(country.code)}
                  />
                  <Label 
                    htmlFor={`country-${country.code}`} 
                    className="text-sm cursor-pointer"
                  >
                    {country.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer les paramètres
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CreatorPrivacySettings;
