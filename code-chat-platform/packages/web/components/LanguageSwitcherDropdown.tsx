'use client';

import { useState, useEffect, useRef } from 'react';

export function LanguageSwitcherDropdown() {
  const [locale, setLocale] = useState('en');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLocale = localStorage.getItem('preferredLocale') || 'en';
    setLocale(savedLocale);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLanguage = (newLocale: string) => {
    localStorage.setItem('preferredLocale', newLocale);
    setLocale(newLocale);
    setIsOpen(false);
    window.dispatchEvent(new Event('languageChanged'));
  };

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' }
  ];

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group"
        title="Switch Language / 言語切り替え"
      >
        {/* Current Language Flag */}
        <span className="text-sm">{currentLanguage.flag}</span>
        
        {/* Language Text - Hidden on small screens */}
        <span className="hidden sm:block text-sm font-medium">
          {currentLanguage.nativeName}
        </span>
        
        {/* Language Code - Visible on small screens only */}
        <span className="sm:hidden text-xs font-bold">
          {currentLanguage.code.toUpperCase()}
        </span>
        
        {/* Arrow Icon */}
        <div className="w-3 h-3 flex items-center justify-center">
          <div className={`w-1.5 h-1.5 border-r border-b border-current transform transition-transform ${
            isOpen ? '-rotate-45' : 'rotate-45'
          }`}></div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white dark:bg-black border border-black dark:border-white shadow-medium min-w-[160px] z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => switchLanguage(language.code)}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all border-b border-black/10 dark:border-white/10 last:border-b-0 ${
                locale === language.code ? 'bg-black/5 dark:bg-white/5' : ''
              }`}
            >
              <span className="text-lg">{language.flag}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{language.nativeName}</div>
                <div className="text-xs opacity-60">{language.name}</div>
              </div>
              {locale === language.code && (
                <div className="w-2 h-2 bg-black dark:bg-white rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 