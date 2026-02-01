import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { Language } from '@/hooks/useLanguageDetection';
import { translations } from '@/lib/translations';

interface TranslationContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const SUPPORTED_LANGUAGES: Language[] = ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl'];

// Singleton store pour garantir la synchronisation globale
let currentLanguage: Language = 'fr';
const listeners = new Set<() => void>();

const getSnapshot = () => currentLanguage;

const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const setGlobalLanguage = (lang: Language) => {
  if (SUPPORTED_LANGUAGES.includes(lang) && lang !== currentLanguage) {
    currentLanguage = lang;
    localStorage.setItem('preferred-language', lang);
    document.documentElement.lang = lang;
    listeners.forEach(listener => listener());
  }
};

// Initialiser au chargement
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('preferred-language');
  if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
    currentLanguage = stored as Language;
  } else {
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase() || 'en';
    currentLanguage = SUPPORTED_LANGUAGES.includes(browserLang as Language) 
      ? browserLang as Language 
      : 'en';
  }
  document.documentElement.lang = currentLanguage;
}

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // useSyncExternalStore garantit le re-render immédiat
  const language = useSyncExternalStore(subscribe, getSnapshot, () => 'fr' as Language);

  const changeLanguage = useCallback((newLang: Language) => {
    setGlobalLanguage(newLang);
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