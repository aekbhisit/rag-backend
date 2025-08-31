import React, { createContext, useState, useContext, useEffect } from 'react';

// Supported languages with their codes and display info
export const SUPPORTED_LANGUAGES = {
  'en-US': { name: 'English', flag: '🇺🇸' },
  'th-TH': { name: 'Thai', flag: '🇹🇭' },
  'ja-JP': { name: 'Japanese', flag: '🇯🇵' },
  'zh-CN': { name: 'Chinese', flag: '🇨🇳' },
};

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  userLanguage: string;
  detectedLanguage: SupportedLanguage;
  switchLanguage: (newLanguage: SupportedLanguage) => void;
}

// Default language to use for server-side rendering
const DEFAULT_LANGUAGE: SupportedLanguage = 'th-TH';

const LanguageContext = createContext<LanguageContextType>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  userLanguage: DEFAULT_LANGUAGE,
  detectedLanguage: DEFAULT_LANGUAGE,
  switchLanguage: () => {},
});

// Map browser language to our supported languages
const mapBrowserLanguageToSupported = (browserLang: string): SupportedLanguage => {
  // Try exact match
  if (browserLang in SUPPORTED_LANGUAGES) {
    return browserLang as SupportedLanguage;
  }
  
  // Try language part only (e.g., 'en' from 'en-GB')
  const langPart = browserLang.split('-')[0];
  
  if (langPart === 'en') return 'en-US';
  if (langPart === 'th') return 'th-TH';
  if (langPart === 'ja') return 'ja-JP';
  if (langPart === 'zh') return 'zh-CN';
  
  // Default to Thai if no match
  return DEFAULT_LANGUAGE;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  // Start with the default language for server-side rendering
  const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [userLanguage, setUserLanguage] = useState<string>(DEFAULT_LANGUAGE);
  
  // Use useEffect to initialize everything on the client side only
  useEffect(() => {
    setIsClient(true);
    
    // Get user's browser language
    const browserLang = navigator.language || DEFAULT_LANGUAGE;
    setUserLanguage(browserLang);
    const detectedLang = mapBrowserLanguageToSupported(browserLang);
    setDetectedLanguage(detectedLang);
    
    // Determine initial language from URL, localStorage, or browser setting
    const getInitialLanguage = (): SupportedLanguage => {
      // Check URL parameter first
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('language');
      if (urlLang && urlLang in SUPPORTED_LANGUAGES) {
        return urlLang as SupportedLanguage;
      }
      
      // Check localStorage second
      try {
        const storedLang = localStorage.getItem('preferred_language');
        if (storedLang && storedLang in SUPPORTED_LANGUAGES) {
          return storedLang as SupportedLanguage;
        }
      } catch (e) {
        console.warn('Error accessing localStorage:', e);
      }
      
      // Use detected language as fallback
      return detectedLang;
    };
    
    // Set the language once we're on the client
    setLanguage(getInitialLanguage());
  }, []);
  
  // Function to switch language and update storage/URL
  const switchLanguage = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
    
    // Only update localStorage and URL if we're on the client
    if (isClient) {
      try {
        localStorage.setItem('preferred_language', newLanguage);
      } catch (e) {
        console.warn('Error saving to localStorage:', e);
      }
      
      // Update URL parameter
      const url = new URL(window.location.toString());
      url.searchParams.set('language', newLanguage);
      window.history.pushState({}, '', url.toString());
    }
  };
  
  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      userLanguage,
      detectedLanguage,
      switchLanguage
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext); 