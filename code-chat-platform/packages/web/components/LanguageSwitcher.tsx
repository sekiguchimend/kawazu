'use client';

import { useState, useEffect } from 'react';

export function LanguageSwitcher() {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const savedLocale = localStorage.getItem('preferredLocale') || 'en';
    setLocale(savedLocale);
  }, []);

  const switchLanguage = () => {
    const newLocale = locale === 'en' ? 'ja' : 'en';
    localStorage.setItem('preferredLocale', newLocale);
    setLocale(newLocale);
    window.dispatchEvent(new Event('languageChanged'));
  };

  return (
    <button 
      onClick={switchLanguage}
      className="flex items-center space-x-2 px-3 py-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group"
      title={locale === 'en' ? 'Switch to Japanese (日本語)' : 'Switch to English (英語)'}
    >
      {/* Globe Icon */}
      <div className="w-4 h-4 border border-current rounded-full flex items-center justify-center relative">
        <div className="w-px h-full bg-current absolute"></div>
        <div className="w-full h-px bg-current absolute"></div>
        <div className="w-2 h-1 border-t border-current absolute top-0.5 rounded-t-full"></div>
        <div className="w-2 h-1 border-b border-current absolute bottom-0.5 rounded-b-full"></div>
      </div>
      
      {/* Language Text - Hidden on small screens */}
      <span className="hidden sm:block text-sm font-medium">
        {locale === 'en' ? '日本語' : 'English'}
      </span>
      
      {/* Language Code - Visible on small screens only */}
      <span className="sm:hidden text-xs font-bold">
        {locale === 'en' ? 'JA' : 'EN'}
      </span>
      
      {/* Arrow Icon - Hidden on mobile */}
      <div className="hidden sm:flex w-3 h-3 items-center justify-center">
        <div className="w-1.5 h-1.5 border-r border-b border-current transform rotate-45 group-hover:rotate-225 transition-transform"></div>
      </div>
    </button>
  );
} 