import { useState, useEffect } from 'react';

export type Language = 'en' | 'fr' | 'es' | 'de' | 'it';

const detectBrowserLanguage = (): Language => {
  // Get user's preferred language from browser
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  
  // Extract language code (e.g., 'fr-FR' becomes 'fr')
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  // Map to supported languages
  const supportedLanguages: Language[] = ['en', 'fr', 'es', 'de', 'it'];
  
  if (supportedLanguages.includes(langCode as Language)) {
    return langCode as Language;
  }
  
  // Default to English if language not supported
  return 'en';
};

export const useLanguageDetection = () => {
  const [language, setLanguage] = useState<Language>(() => {
    // Check if language is stored in localStorage
    const stored = localStorage.getItem('preferred-language');
    if (stored && ['en', 'fr', 'es', 'de', 'it'].includes(stored)) {
      return stored as Language;
    }
    // Otherwise detect from browser
    return detectBrowserLanguage();
  });

  useEffect(() => {
    // Store the detected/selected language
    localStorage.setItem('preferred-language', language);
  }, [language]);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  return {
    language,
    changeLanguage,
    detectedLanguage: detectBrowserLanguage()
  };
};
