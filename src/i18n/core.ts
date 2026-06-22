import ja from '@/i18n/locales/ja';
import en from '@/i18n/locales/en';
import type { Locale, MessageTree } from '@/i18n/types';
import { SECTION_SECONDS } from '@/types';
import {
  FREE_MAX_CREATED_SONGS,
  FREE_DAILY_LAYER_SESSIONS,
  FREE_DAILY_EXTEND_SESSIONS,
} from '@/lib/plan';

const MESSAGES: Record<Locale, MessageTree> = { ja, en };

let currentLocale: Locale = 'ja';

export function getLocale(): Locale {
  return currentLocale;
}

export function setRuntimeLocale(locale: Locale): void {
  currentLocale = locale;
  document.documentElement.lang = locale;
}

export function detectLocale(saved?: Locale | null): Locale {
  if (saved === 'ja' || saved === 'en') return saved;
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('ja')) return 'ja';
  return 'en';
}

function getNested(tree: MessageTree, key: string): string | undefined {
  const parts = key.split('.');
  let node: MessageValue = tree;
  for (const part of parts) {
    if (typeof node === 'string' || node == null) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

type MessageValue = string | MessageTree;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function t(key: string, vars?: Record<string, string | number>, locale?: Locale): string {
  const loc = locale ?? currentLocale;
  const msg = getNested(MESSAGES[loc], key) ?? getNested(MESSAGES.ja, key) ?? key;
  return interpolate(msg, vars);
}

export function translateError(reason: string, locale?: Locale): string {
  const loc = locale ?? currentLocale;
  if (reason.startsWith('bpmOutOfRange|')) {
    const [, min, max] = reason.split('|');
    return t('errors.bpmOutOfRange', { min: min ?? '', max: max ?? '' }, loc);
  }
  if (reason === 'songCreateLimit') {
    return t('errors.songCreateLimit', { max: FREE_MAX_CREATED_SONGS }, loc);
  }
  if (reason === 'dailySessionLimit' || reason === 'dailyLayerSessionLimit') {
    return t('errors.dailyLayerSessionLimit', { dailyMax: FREE_DAILY_LAYER_SESSIONS }, loc);
  }
  if (reason === 'dailyExtendSessionLimit') {
    return t('errors.dailyExtendSessionLimit', { dailyMax: FREE_DAILY_EXTEND_SESSIONS }, loc);
  }
  if (reason === 'alreadyExtended') {
    return t('errors.alreadyExtended', undefined, loc);
  }
  const translated = t(`errors.${reason}`, undefined, loc);
  if (translated !== `errors.${reason}`) return translated;
  return reason;
}

export function formatPartOrdinal(n: number, locale?: Locale): string {
  return t('part.ordinal', { n }, locale);
}

export function formatSectionTime(sectionIndex: number, locale?: Locale): string {
  const start = sectionIndex * SECTION_SECONDS;
  const end = start + SECTION_SECONDS;
  return t('section.time', { start, end }, locale);
}

export function formatBpmSections(sectionBpms: number[], locale?: Locale): string {
  if ([...new Set(sectionBpms)].length === 1) {
    return `${sectionBpms[0]} BPM`;
  }
  return sectionBpms
    .map((bpm, i) => t('section.bpmRange', {
      start: i * SECTION_SECONDS,
      end: (i + 1) * SECTION_SECONDS,
      bpm,
    }, locale))
    .join(' · ');
}

export function getAddModeTitle(mode: 'layer' | 'extend', locale?: Locale): string {
  return t(`addMode.${mode}Title`, undefined, locale);
}

export function getAddModeDesc(mode: 'layer' | 'extend', locale?: Locale): string {
  return t(`addMode.${mode}Desc`, undefined, locale);
}
