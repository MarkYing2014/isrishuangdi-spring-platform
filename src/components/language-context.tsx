"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type SupportedLanguage = "en" | "zh";

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLanguage = "zh",
}: {
  children: React.ReactNode;
  initialLanguage?: SupportedLanguage;
}) {
  const [language, setLanguageState] = useState<SupportedLanguage>(initialLanguage);

  const setLanguage = (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    // Persist to cookie
    document.cookie = `lang=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`;
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => {
        const nextLang = language === "en" ? "zh" : "en";
        setLanguage(nextLang);
      },
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function LanguageText({ en, zh }: { en: string; zh: string }) {
  const { language } = useLanguage();
  return <>{language === "en" ? en : zh}</>;
}
