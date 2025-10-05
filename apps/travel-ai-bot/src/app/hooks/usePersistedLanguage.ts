"use client";

import { useState, useEffect } from 'react';

type Language = 'en' | 'th';

const STORAGE_KEY = 'travel-app-language';

export function usePersistedLanguage(defaultLanguage: Language = 'en') {
  // Always start with default language to avoid hydration mismatch
  const [currentLanguage, setCurrentLanguage] = useState<Language>(defaultLanguage);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration (only run once)
  useEffect(() => {
    setIsHydrated(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      const savedLanguage = (saved === 'th' || saved === 'en') ? saved : defaultLanguage;
      if (savedLanguage !== defaultLanguage) {
        setCurrentLanguage(savedLanguage);
        console.log(`[Language] 🔄 Loaded saved language preference: ${savedLanguage}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run once on mount, defaultLanguage is stable

  // Save to localStorage whenever language changes (but only after hydration)
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, currentLanguage);
      console.log(`[Language] 💾 Saved language preference: ${currentLanguage}`);
    }
  }, [currentLanguage, isHydrated]);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
  };

  return [currentLanguage, setLanguage] as const;
}
