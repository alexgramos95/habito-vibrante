/**
 * Locale getter for non-React contexts (hooks/services without I18nContext).
 * Mirrors the same key used by I18nContext.
 */
export type AppLocale = 'pt-PT' | 'en-US';

const LOCALE_STORAGE_KEY = 'become-locale';

export function getCurrentLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'pt-PT' || stored === 'en-US') return stored;
  } catch {}
  try {
    const browserLang = navigator.language || 'en-US';
    return browserLang.startsWith('pt') ? 'pt-PT' : 'en-US';
  } catch {
    return 'en-US';
  }
}

export const isPT = (): boolean => getCurrentLocale() === 'pt-PT';
