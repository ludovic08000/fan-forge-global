import { useState, useEffect } from 'react';

export type Language = 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'nl';

// Mapping code pays -> langue
const COUNTRY_TO_LANGUAGE: Record<string, Language> = {
  // Français
  FR: 'fr', BE: 'fr', CH: 'fr', LU: 'fr', MC: 'fr', CA: 'fr',
  // Anglais  
  US: 'en', GB: 'en', AU: 'en', NZ: 'en', IE: 'en', ZA: 'en',
  // Espagnol
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  // Allemand
  DE: 'de', AT: 'de',
  // Italien
  IT: 'it',
  // Portugais
  PT: 'pt', BR: 'pt',
  // Néerlandais
  NL: 'nl',
};

const detectBrowserLanguage = (): Language => {
  // Get user's preferred language from browser
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  
  // Extract language code (e.g., 'fr-FR' becomes 'fr')
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  // Map to supported languages
  const supportedLanguages: Language[] = ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl'];
  
  if (supportedLanguages.includes(langCode as Language)) {
    return langCode as Language;
  }
  
  // Default to English if language not supported
  return 'en';
};

const detectLanguageFromCountry = async (): Promise<Language | null> => {
  try {
    // Check cached geo data first
    const cached = localStorage.getItem('geo-location');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.data?.countryCode) {
        return COUNTRY_TO_LANGUAGE[parsed.data.countryCode] || null;
      }
    }
    
    // Fallback: use timezone to guess country
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
      return COUNTRY_TO_LANGUAGE[countryCode] || null;
    }
    
    return null;
  } catch {
    return null;
  }
};

export const useLanguageDetection = () => {
  const [language, setLanguage] = useState<Language>(() => {
    // Check if language is stored in localStorage
    const stored = localStorage.getItem('preferred-language');
    if (stored && ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl'].includes(stored)) {
      return stored as Language;
    }
    // Otherwise detect from browser
    return detectBrowserLanguage();
  });
  const [detectedFromCountry, setDetectedFromCountry] = useState<Language | null>(null);

  useEffect(() => {
    // Try to detect language from country (async)
    const detectFromCountry = async () => {
      const countryLang = await detectLanguageFromCountry();
      if (countryLang) {
        setDetectedFromCountry(countryLang);
        
        // If user hasn't explicitly set a language, use country detection
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
    // Store the detected/selected language
    localStorage.setItem('preferred-language', language);
    
    // Update HTML lang attribute for SEO
    document.documentElement.lang = language;
  }, [language]);

  // Listen for storage changes (sync across tabs/components)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferred-language' && e.newValue) {
        const supportedLangs: Language[] = ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl'];
        if (supportedLangs.includes(e.newValue as Language)) {
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
    supportedLanguages: ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl'] as Language[]
  };
};
