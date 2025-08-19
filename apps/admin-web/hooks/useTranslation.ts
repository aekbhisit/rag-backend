import { useMemo, useState, useEffect } from 'react';
import { translations } from '../lib/translations';
import { getLanguage, DEFAULT_LANGUAGE } from '../lib/i18n';

export function useTranslation() {
  const [currentLang, setCurrentLang] = useState<typeof DEFAULT_LANGUAGE>(DEFAULT_LANGUAGE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentLang(getLanguage());
  }, []);

  const t = useMemo(() => {
    return (key: keyof typeof translations.en): string => {
      return translations[currentLang][key] || translations.en[key] || key;
    };
  }, [currentLang]);
  
  return {
    t,
    currentLang,
    isThai: currentLang === 'th',
    mounted
  };
}
