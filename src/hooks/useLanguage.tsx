import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { translations, Language, defaultLanguage, getNestedValue, languageNames } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  languageNames: typeof languageNames;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get from localStorage first for immediate display
    const stored = localStorage.getItem('focusplus_language');
    return (stored as Language) || defaultLanguage;
  });
  const { user } = useAuth();

  // Load language preference from database when user is authenticated
  useEffect(() => {
    async function loadLanguagePreference() {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('language_preference')
        .eq('user_id', user.id)
        .single();
      
      if (data?.language_preference && data.language_preference !== language) {
        const lang = data.language_preference as Language;
        if (lang in translations) {
          setLanguageState(lang);
          localStorage.setItem('focusplus_language', lang);
        }
      }
    }
    
    loadLanguagePreference();
  }, [user]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('focusplus_language', lang);
    
    // Save to database if user is authenticated
    if (user) {
      await supabase
        .from('profiles')
        .update({ language_preference: lang })
        .eq('user_id', user.id);
    }
  }, [user]);

  const t = useCallback((key: string): string => {
    // Try current language first
    const value = getNestedValue(translations[language], key);
    if (value !== key) return value;
    
    // Fallback to English
    if (language !== defaultLanguage) {
      return getNestedValue(translations[defaultLanguage], key);
    }
    
    return key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languageNames }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
