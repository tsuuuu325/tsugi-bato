import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  detectLocale,
  formatBpmSections,
  formatPartOrdinal,
  formatSectionTime,
  getAddModeDesc,
  getAddModeTitle,
  setRuntimeLocale,
  t as translate,
  translateError,
} from '@/i18n/core';
import type { Locale } from '@/i18n/types';
import { getUserProfile, saveUserProfile } from '@/lib/profile';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  translateError: (reason: string) => string;
  formatPart: (n: number) => string;
  formatSection: (sectionIndex: number) => string;
  formatBpmSections: (sectionBpms: number[]) => string;
  addModeTitle: (mode: 'layer' | 'extend') => string;
  addModeDesc: (mode: 'layer' | 'extend') => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale(getUserProfile().locale));

  useEffect(() => {
    setRuntimeLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    const profile = getUserProfile();
    saveUserProfile({ ...profile, locale: next });
    setRuntimeLocale(next);
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key, vars) => translate(key, vars, locale),
    translateError: (reason) => translateError(reason, locale),
    formatPart: (n) => formatPartOrdinal(n, locale),
    formatSection: (si) => formatSectionTime(si, locale),
    formatBpmSections: (bpms) => formatBpmSections(bpms, locale),
    addModeTitle: (mode) => getAddModeTitle(mode, locale),
    addModeDesc: (mode) => getAddModeDesc(mode, locale),
  }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LocaleProvider');
  return ctx;
}
