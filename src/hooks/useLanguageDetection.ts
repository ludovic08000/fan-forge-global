import { useState, useEffect } from 'react';

export type Language = 'en' | 'fr';

const SUPPORTED_LANGUAGES: Language[] = ['en', 'fr'];

// Mapping code pays -> langue
const COUNTRY_TO_LANGUAGE: Record<string, Language> = {
  // Français
  FR: 'fr', BE: 'fr', CH: 'fr', LU: 'fr', MC: 'fr', CA: 'fr',
  // Anglais (tout le reste)
  US: 'en', GB: 'en', AU: 'en', NZ: 'en', IE: 'en', ZA: 'en',
  ES: 'en', MX: 'en', AR: 'en', CO: 'en', CL: 'en', PE: 'en',
  DE: 'en', AT: 'en', IT: 'en', PT: 'en', BR: 'en', NL: 'en',
};

const detectBrowserLanguage = (): Language => {
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  if (SUPPORTED_LANGUAGES.includes(langCode as Language)) {
    return langCode as Language;
  }
  
  return 'en';
};

const detectLanguageFromCountry = async (): Promise<Language | null> => {
  try {
    const cached = localStorage.getItem('geo-location');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.data?.countryCode) {
        return COUNTRY_TO_LANGUAGE[parsed.data.countryCode] || 'en';
      }
    }
    
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneToCountry: Record<string, string> = {
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Europe/London': 'GB',
      'Europe/Madrid': 'ES',
      'Europe/Rome': 'IT',
      'Europe/Amsterdam': 'NL',
      'Europe/Brussels': 'BE',
      'Europe/Lisbon': 'PT',
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Sao_Paulo': 'BR',
    };
    
    const countryCode = timezoneToCountry[timezone];
    if (countryCode) {
      return COUNTRY_TO_LANGUAGE[countryCode] || 'en';
    }
    
    return null;
  } catch {
    return null;
  }
};

export const useLanguageDetection = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('preferred-language');
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
    return detectBrowserLanguage();
  });
  const [detectedFromCountry, setDetectedFromCountry] = useState<Language | null>(null);

  useEffect(() => {
    const detectFromCountry = async () => {
      const countryLang = await detectLanguageFromCountry();
      if (countryLang) {
        setDetectedFromCountry(countryLang);
        const stored = localStorage.getItem('preferred-language');
        if (!stored) {
          setLanguage(countryLang);
          localStorage.setItem('preferred-language', countryLang);
        }
      }
    };
    
    detectFromCountry();
  }, []);

  useEffect(() => {
    localStorage.setItem('preferred-language', language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferred-language' && e.newValue) {
        if (SUPPORTED_LANGUAGES.includes(e.newValue as Language)) {
          setLanguage(e.newValue as Language);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('preferred-language', newLanguage);
    document.documentElement.lang = newLanguage;
  };

  return {
    language,
    changeLanguage,
    detectedLanguage: detectBrowserLanguage(),
    detectedFromCountry,
    supportedLanguages: SUPPORTED_LANGUAGES
  };
};
