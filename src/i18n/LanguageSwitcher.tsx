import { LOCALES } from '@/i18n/types';
import { useI18n } from '@/i18n/LocaleProvider';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="lang-switcher">
      <span className="lang-switcher-label">{t('lang.label')}</span>
      <select
        className="lang-switcher-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        aria-label={t('lang.label')}
      >
        {LOCALES.map((l) => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}
