export type Language = 'en' | 'th';

export interface LocaleConfig {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸'
  },
  {
    code: 'th',
    name: 'Thai',
    nativeName: 'ไทย',
    flag: '🇹🇭'
  }
];

export const DEFAULT_LANGUAGE: Language = 'en';

export function getLanguage(): Language {
  // During SSR, always return default language to prevent hydration mismatch
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  
  try {
    const stored = localStorage.getItem('language');
    if (stored && SUPPORTED_LANGUAGES.some(lang => lang.code === stored)) {
      return stored as Language;
    }
    
    // Try to detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'th') return 'th';
  } catch (error) {
    // Fallback if localStorage is not available
    console.warn('Failed to get language from localStorage:', error);
  }
  
  return DEFAULT_LANGUAGE;
}

export function setLanguage(lang: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang);
    window.location.reload(); // Reload to apply language change
  }
}
