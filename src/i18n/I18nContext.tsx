import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { format as dateFnsFormat, Locale as DateFnsLocale } from 'date-fns';
import { pt } from 'date-fns/locale';
import { enUS as enUSDateFns } from 'date-fns/locale';
import { ptPT } from './locales/pt-PT';
import { enUS } from './locales/en-US';
import type { Translations } from './locales/pt-PT';

export type Locale = 'pt-PT' | 'en-US';
export type Currency = 'EUR' | 'USD';

const locales: Record<Locale, Translations> = {
  'pt-PT': ptPT,
  'en-US': enUS,
};

const currencySymbols: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
};

const LOCALE_STORAGE_KEY = 'become-locale';
const CURRENCY_STORAGE_KEY = 'become-currency';

const getStoredLocale = (): Locale => {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'pt-PT' || stored === 'en-US') {
      return stored;
    }
  } catch {}
  const browserLang = navigator.language || 'en-US';
  return browserLang.startsWith('pt') ? 'pt-PT' : 'en-US';
};

const getStoredCurrency = (): Currency => {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored === 'EUR' || stored === 'USD') {
      return stored;
    }
  } catch {}
  return getStoredLocale() === 'pt-PT' ? 'EUR' : 'USD';
};

interface I18nContextType {
  locale: Locale;
  currency: Currency;
  t: Translations;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number, decimals?: number) => string;
  formatDate: (date: Date, formatStr: string) => string;
  dateFnsLocale: DateFnsLocale;
  currencySymbol: string;
  tr: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const dateFnsLocales: Record<Locale, DateFnsLocale> = {
  'pt-PT': pt,
  'en-US': enUSDateFns,
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => getStoredLocale());
  const [currency, setCurrencyState] = useState<Currency>(() => getStoredCurrency());

  const t = useMemo(() => locales[locale], [locale]);
  const dateFnsLocale = useMemo(() => dateFnsLocales[locale], [locale]);
  const currencySymbol = useMemo(() => currencySymbols[currency], [currency]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {}
  }, []);

  const setCurrencyFn = useCallback((newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
    } catch {}
  }, []);

  const formatCurrency = useCallback((value: number): string => {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    
    return formatted;
  }, [locale, currency]);

  const formatNumber = useCallback((value: number, decimals: number = 2): string => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }, [locale]);

  const formatDate = useCallback((date: Date, formatStr: string): string => {
    return dateFnsFormat(date, formatStr, { locale: dateFnsLocale });
  }, [dateFnsLocale]);

  // Template replacement function
  const tr = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = t;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }
    
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() ?? `{{${paramKey}}}`;
      });
    }
    
    return value;
  }, [t]);

  const contextValue = useMemo<I18nContextType>(() => ({
    locale,
    currency,
    t,
    setLocale,
    setCurrency: setCurrencyFn,
    formatCurrency,
    formatNumber,
    formatDate,
    dateFnsLocale,
    currencySymbol,
    tr,
  }), [locale, currency, t, setLocale, setCurrencyFn, formatCurrency, formatNumber, formatDate, dateFnsLocale, currencySymbol, tr]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
