import React from 'react';
import { SUPPORTED_LANGUAGES, getLanguage, setLanguage } from '../../lib/i18n';

export function LanguageSwitcher() {
  const currentLang = getLanguage();
  
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as any);
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">🌐</span>
      <select
        value={currentLang}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="border rounded px-2 py-1 text-sm bg-white"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
