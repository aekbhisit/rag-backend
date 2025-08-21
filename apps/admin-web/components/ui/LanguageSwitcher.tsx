import React from 'react';
import { SUPPORTED_LANGUAGES, getLanguage, setLanguage } from '../../lib/i18n';
import { Select } from './Select';

export function LanguageSwitcher() {
  const currentLang = getLanguage();
  
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as any);
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">🌐</span>
      <Select
        size="sm"
        placeholder="Select language"
        value={currentLang}
        onChange={(e) => handleLanguageChange(e.target.value)}
        options={SUPPORTED_LANGUAGES.map((lang) => ({
          value: lang.code,
          label: `${lang.flag} ${lang.nativeName}`
        }))}
      />
    </div>
  );
}
