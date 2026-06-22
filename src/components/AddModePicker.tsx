import type { LayerAddMode } from '@/types';
import { SECTION_SECONDS } from '@/types';
import { getMaxSections } from '@/lib/plan';
import { useI18n } from '@/i18n/LocaleProvider';

interface AddModePickerProps {
  value: LayerAddMode | null;
  onChange: (mode: LayerAddMode) => void;
  currentSectionCount: number;
  lockedMode?: LayerAddMode | null;
  canLayer?: boolean;
  canExtend?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export function AddModePicker({
  value,
  onChange,
  currentSectionCount,
  lockedMode = null,
  canLayer = true,
  canExtend = true,
  disabled = false,
  compact = false,
}: AddModePickerProps) {
  const { t, formatSection } = useI18n();
  const maxSections = getMaxSections();
  const maxSongSeconds = maxSections * SECTION_SECONDS;
  const nextSectionLabel = formatSection(currentSectionCount);
  const effectiveValue = lockedMode ?? value;
  const atMaxSections = currentSectionCount >= maxSections;

  return (
    <div className={`add-mode-picker ${compact ? 'add-mode-picker--compact' : ''}`}>
      {!compact && <h2 className="section-title">{t('addMode.title')}</h2>}
      <div className={`add-mode-grid ${atMaxSections ? 'add-mode-grid--single' : ''}`}>
        <button
          type="button"
          className={`add-mode-card add-mode-card--layer ${effectiveValue === 'layer' ? 'add-mode-card--active' : ''}`}
          onClick={() => onChange('layer')}
          disabled={disabled || lockedMode === 'extend' || !canLayer}
          aria-pressed={effectiveValue === 'layer'}
          title={!canLayer ? t('addMode.layerBlocked') : undefined}
        >
          <span className="add-mode-icon">🎛️</span>
          <span className="add-mode-title">{t('addMode.layerTitle')}</span>
          <span className="add-mode-desc">
            {canLayer ? t('addMode.layerDesc') : t('addMode.layerDailyLimit')}
          </span>
        </button>
        {!atMaxSections && (
          <button
            type="button"
            className={`add-mode-card add-mode-card--extend ${effectiveValue === 'extend' ? 'add-mode-card--active' : ''}`}
            onClick={() => onChange('extend')}
            disabled={disabled || lockedMode === 'layer' || !canExtend}
            aria-pressed={effectiveValue === 'extend'}
            title={!canExtend ? t('addMode.extendBlocked') : undefined}
          >
            <span className="add-mode-icon">➡️</span>
            <span className="add-mode-title">{t('addMode.extendTitle')}</span>
            <span className="add-mode-desc">
              {canExtend
                ? t('addMode.extendNew', { section: nextSectionLabel })
                : atMaxSections
                  ? t('addMode.maxReached', { max: maxSongSeconds })
                  : t('addMode.extendDailyLimit')}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
