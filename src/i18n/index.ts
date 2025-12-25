import en from './en.json';
import hi from './hi.json';
import te from './te.json';
import ta from './ta.json';

export type Language = 'en' | 'hi' | 'te' | 'ta';

export const translations: Record<Language, typeof en> = {
  en,
  hi,
  te,
  ta,
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी (Hindi)',
  te: 'తెలుగు (Telugu)',
  ta: 'தமிழ் (Tamil)',
};

export const defaultLanguage: Language = 'en';

// Type-safe translation key getter
export type TranslationKeys = typeof en;

export function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path; // Return the key itself as fallback
    }
  }
  return typeof result === 'string' ? result : path;
}
