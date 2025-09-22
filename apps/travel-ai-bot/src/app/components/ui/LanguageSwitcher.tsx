import React, { useState, useEffect } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '@/app/contexts/LanguageContext';

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { language, switchLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only show the component after client-side hydration is complete
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    switchLanguage(lang);
    setIsOpen(false);
  };

  // Don't render anything during SSR or before hydration is complete
  if (!mounted) {
    return <div className={`relative ${className} w-24 h-8`} aria-hidden="true" />;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
        aria-label="Select language"
      >
        <span className="text-xl" aria-hidden="true">{SUPPORTED_LANGUAGES[language].flag}</span>
        <span className="text-sm font-medium">{SUPPORTED_LANGUAGES[language].name}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, { name, flag }]) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code as SupportedLanguage)}
                className={`flex items-center w-full text-left px-4 py-2 text-sm ${
                  language === code ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                } hover:bg-gray-100`}
                role="menuitem"
              >
                <span className="mr-2 text-lg">{flag}</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher; 