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
    return ((key: keyof typeof translations.en) => {
      const table = translations[currentLang] as typeof translations.en;
      const val = table[key] as unknown as string | undefined;
      return (val ?? (translations.en[key] as unknown as string)) ?? (key as unknown as string);
    }) as (key: keyof typeof translations.en) => string;
  }, [currentLang]);
  
  return {
    t,
    currentLang,
    isThai: currentLang === 'th',
    mounted
  };
}
