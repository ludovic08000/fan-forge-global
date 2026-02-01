import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { Language } from '@/hooks/useLanguageDetection';
import { translations } from '@/lib/translations';

interface TranslationContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const SUPPORTED_LANGUAGES: Language[] = ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl'];

const detectBrowserLanguage = (): Language => {
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  if (SUPPORTED_LANGUAGES.includes(langCode as Language)) {
    return langCode as Language;
  }
  return 'en';
};

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'fr';
  
  const stored = localStorage.getItem('preferred-language');
  if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
    return stored as Language;
  }
  return detectBrowserLanguage();
};

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  // Synchroniser avec localStorage et le DOM
  useEffect(() => {
    localStorage.setItem('preferred-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = useCallback((newLang: Language) => {
    if (SUPPORTED_LANGUAGES.includes(newLang)) {
      setLanguage(newLang);
    }
  }, []);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  }, [language]);

  return (
    <TranslationContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};