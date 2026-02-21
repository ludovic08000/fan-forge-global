import React, { createContext, useContext, ReactNode, useCallback, useSyncExternalStore } from 'react';
import { Language } from '@/hooks/useLanguageDetection';
import { translations } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Cache des traductions générées par l'IA (en mémoire, par session)
const aiTranslationsCache: Record<string, Record<string, any>> = {};
let isGenerating = false;

const getSnapshot = () => currentLanguage;

const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

const setGlobalLanguage = (lang: Language) => {
  if (SUPPORTED_LANGUAGES.includes(lang) && lang !== currentLanguage) {
    currentLanguage = lang;
    localStorage.setItem('preferred-language', lang);
    document.documentElement.lang = lang;
    notifyListeners();
    
    // Vérifier et générer les traductions manquantes via IA
    checkAndGenerateMissingTranslations(lang);
  }
};

// Vérifier si des clés manquent pour une langue et appeler l'IA
async function checkAndGenerateMissingTranslations(lang: Language) {
  if (lang === 'en' || isGenerating) return; // L'anglais est la source
  
  const enKeys = translations['en'];
  const langKeys = { ...translations[lang], ...aiTranslationsCache[lang] };
  
  // Trouver les clés manquantes
  const missingKeys: Record<string, any> = {};
  let hasMissing = false;
  
  function findMissing(source: any, target: any, prefix: string = '') {
    for (const key of Object.keys(source)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof source[key] === 'object' && source[key] !== null) {
        if (!target || typeof target[key] !== 'object') {
          // Toute la section manque
          setNestedValue(missingKeys, fullKey, source[key]);
          hasMissing = true;
        } else {
          findMissing(source[key], target[key], fullKey);
        }
      } else {
        if (!target || target[key] === undefined) {
          setNestedValue(missingKeys, fullKey, source[key]);
          hasMissing = true;
        }
      }
    }
  }
  
  findMissing(enKeys, langKeys);
  
  if (!hasMissing) return;
  
  isGenerating = true;
  
  try {
    console.log(`[Translation] Generating missing translations for ${lang}...`);
    
    const { data, error } = await supabase.functions.invoke('generate-translations', {
      body: {
        sourceTexts: missingKeys,
        targetLanguages: [lang],
      },
    });
    
    if (error) {
      console.error('[Translation] AI generation error:', error);
      return;
    }
    
    if (data?.translations?.[lang]) {
      // Stocker dans le cache
      if (!aiTranslationsCache[lang]) {
        aiTranslationsCache[lang] = {};
      }
      deepMerge(aiTranslationsCache[lang], data.translations[lang]);
      
      console.log(`[Translation] Successfully generated translations for ${lang}`);
      toast.success(`Traductions ${lang.toUpperCase()} générées par IA ✨`);
      
      // Notifier les composants pour re-render
      notifyListeners();
    }
  } catch (err) {
    console.error('[Translation] Failed to generate translations:', err);
  } finally {
    isGenerating = false;
  }
}

function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function deepMerge(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

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
  const language = useSyncExternalStore(subscribe, getSnapshot, () => 'fr' as Language);

  const changeLanguage = useCallback((newLang: Language) => {
    setGlobalLanguage(newLang);
  }, []);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    
    // 1. Chercher dans le cache IA
    let value: any = aiTranslationsCache[language];
    if (value) {
      for (const k of keys) {
        value = value?.[k];
      }
      if (value && typeof value === 'string') return value;
    }
    
    // 2. Chercher dans les traductions statiques
    value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    if (value && typeof value === 'string') return value;
    
    // 3. Fallback vers l'anglais
    value = translations['en'];
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
