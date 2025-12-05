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
  defaultLanguage = "zh",
}: {
  children: React.ReactNode;
  defaultLanguage?: SupportedLanguage;
}) {
  const [language, setLanguage] = useState<SupportedLanguage>(defaultLanguage);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((prev) => (prev === "en" ? "zh" : "en")),
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
