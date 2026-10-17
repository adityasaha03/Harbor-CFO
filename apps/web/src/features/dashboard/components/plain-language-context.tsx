'use client';

import * as React from 'react';

export interface PlainLanguageContextValue {
  isPlainLanguage: boolean;
  togglePlainLanguage: () => void;
  translate: (key: string, fallback: string) => string;
}

const PLAIN_TRANSLATIONS: Record<string, string> = {
  'liquidity_floor': 'Emergency Cash Buffer',
  'liquidity_gap': 'Cash Shortage to Cover',
  'dso': 'Days to Collect Invoices',
  'ar_aging': 'Overdue Invoices Timeline',
  'concentration': 'Top Customer Dependency',
  'bridge_loan': 'Short-Term Cash Bridge Loan',
  'revolver': 'Flexible Credit Draw',
  'burn_rate': 'Monthly Net Cash Outflow',
  'action_proposal': 'Formal Financial Draft',
  'deterministic_forecast': 'Mathematically Exact Cash Schedule',
};

const PlainLanguageContext = React.createContext<PlainLanguageContextValue | null>(null);

const STORAGE_KEY = 'harbor_plain_language_mode';

export function PlainLanguageProvider({ children }: { children: React.ReactNode }) {
  const [isPlainLanguage, setIsPlainLanguage] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsPlainLanguage(stored === 'true');
      }
    } catch {
      // Ignored
    }
  }, []);

  const togglePlainLanguage = React.useCallback(() => {
    setIsPlainLanguage((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignored
      }
      return next;
    });
  }, []);

  const translate = React.useCallback(
    (key: string, fallback: string) => {
      if (!isPlainLanguage) return fallback;
      return PLAIN_TRANSLATIONS[key] || fallback;
    },
    [isPlainLanguage],
  );

  const value = React.useMemo(
    () => ({ isPlainLanguage, togglePlainLanguage, translate }),
    [isPlainLanguage, togglePlainLanguage, translate],
  );

  return (
    <PlainLanguageContext.Provider value={value}>
      {children}
    </PlainLanguageContext.Provider>
  );
}

export function usePlainLanguage() {
  const ctx = React.useContext(PlainLanguageContext);
  if (!ctx) {
    return {
      isPlainLanguage: false,
      togglePlainLanguage: () => undefined,
      translate: (_k: string, fb: string) => fb,
    };
  }
  return ctx;
}

