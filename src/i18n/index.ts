import { ptPT, type Translations } from './locales/pt-PT';
import { enUS } from './locales/en-US';

export type Locale = 'pt-PT' | 'en-US';
export type Currency = 'EUR' | 'USD';

export const locales: Record<Locale, Translations> = {
  'pt-PT': ptPT,
  'en-US': enUS,
};

export const currencySymbols: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
};

export const currencyNames: Record<Currency, Record<Locale, string>> = {
  EUR: { 'pt-PT': 'Euro (€)', 'en-US': 'Euro (€)' },
  USD: { 'pt-PT': 'Dólar Americano ($)', 'en-US': 'US Dollar ($)' },
};

export const localeNames: Record<Locale, string> = {
  'pt-PT': 'Português (Portugal)',
  'en-US': 'English (US)',
};

// Detect browser locale
export const detectLocale = (): Locale => {
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en-US';
  
  if (browserLang.startsWith('pt')) {
    return 'pt-PT';
  }
  
  return 'en-US';
};

// Detect currency based on locale
export const detectCurrency = (locale: Locale): Currency => {
  if (locale === 'pt-PT') {
    return 'EUR';
  }
  return 'USD';
};

// Storage keys
const LOCALE_STORAGE_KEY = 'habit-tracker-locale';
const CURRENCY_STORAGE_KEY = 'habit-tracker-currency';

export const getStoredLocale = (): Locale | null => {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'pt-PT' || stored === 'en-US') {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
};

export const setStoredLocale = (locale: Locale): void => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    console.error('Failed to save locale to localStorage');
  }
};

export const getStoredCurrency = (): Currency | null => {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored === 'EUR' || stored === 'USD') {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
};

export const setStoredCurrency = (currency: Currency): void => {
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  } catch {
    console.error('Failed to save currency to localStorage');
  }
};

// Initialize locale and currency
export const initializeI18n = (): { locale: Locale; currency: Currency } => {
  let locale = getStoredLocale();
  let currency = getStoredCurrency();
  
  if (!locale) {
    locale = detectLocale();
    setStoredLocale(locale);
  }
  
  if (!currency) {
    currency = detectCurrency(locale);
    setStoredCurrency(currency);
  }
  
  return { locale, currency };
};

// Template string replacement
export const t = (
  translations: Translations,
  key: string,
  params?: Record<string, string | number>
): string => {
  const keys = key.split('.');
  let value: any = translations;
  
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
};

export { ptPT, enUS };
export type { Translations };
