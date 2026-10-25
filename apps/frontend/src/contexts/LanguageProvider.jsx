import { useEffect, useMemo, useState } from 'react';

import { LanguageContext } from './language-context.js';

function initialLanguage() {
  const savedLanguage = window.localStorage.getItem('dr250-language');
  return savedLanguage === 'bn' ? 'bn' : 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(initialLanguage);

  useEffect(() => {
    window.localStorage.setItem('dr250-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === 'en' ? 'bn' : 'en')),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
