import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    // Get stored language preference
    const storedLanguage = localStorage.getItem('emergency_aid_language');
    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'bn')) {
      setCurrentLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    } else {
      // Auto-detect browser language
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang.startsWith('bn')) {
        setCurrentLanguage('bn');
        i18n.changeLanguage('bn');
      } else {
        setCurrentLanguage('en');
        i18n.changeLanguage('en');
      }
    }
  }, [i18n]);

  const changeLanguage = (language) => {
    if (language === 'en' || language === 'bn') {
      setCurrentLanguage(language);
      i18n.changeLanguage(language);
      localStorage.setItem('emergency_aid_language', language);
    }
  };

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'en' ? 'bn' : 'en';
    changeLanguage(newLanguage);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    toggleLanguage,
    isEnglish: currentLanguage === 'en',
    isBangla: currentLanguage === 'bn',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 