import { useState, useCallback } from 'react';
import type { PadDefinition } from '@/types';
import { audioEngine } from '@/audio/engine';
import { useI18n } from '@/i18n/LocaleProvider';

interface DrumPadGridProps {
  pads: PadDefinition[];
  selectedId: string | null;
  onSelect: (padId: string) => void;
  activePadIds?: string[];
  columns?: number;
}

export function DrumPadGrid({
  pads,
  selectedId,
  onSelect,
  activePadIds = [],
  columns = 4,
}: DrumPadGridProps) {
  const { t } = useI18n();
  const [litPad, setLitPad] = useState<string | null>(null);

  const handleTap = useCallback((pad: PadDefinition) => {
    setLitPad(pad.id);
    onSelect(pad.id);
    void audioEngine.playPadOnce(pad.id).catch(() => {});
    setTimeout(() => setLitPad(null), 150);
  }, [onSelect]);

  if (pads.length === 0) {
    return <p className="pad-empty">{t('common.noPads')}</p>;
  }

  const sorted = [...pads].sort((a, b) => a.gridIndex - b.gridIndex);

  return (
    <div className="drum-pad-machine">
      <div className="pad-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {sorted.map((pad) => {
          const isSelected = selectedId === pad.id;
          const isActive = activePadIds.includes(pad.id);
          const isLit = litPad === pad.id;
          const isLong = pad.isLong === true;
          return (
            <button
              key={pad.id}
              type="button"
              className={`drum-pad ${isLong ? 'drum-pad--long' : ''} ${isSelected ? 'drum-pad--selected' : ''} ${isActive ? 'drum-pad--active' : ''} ${isLit ? 'drum-pad--lit' : ''}`}
              style={{
                '--pad-color': pad.color,
                '--pad-dark': pad.colorDark,
              } as React.CSSProperties}
              onClick={() => handleTap(pad)}
              title={pad.shortLabel}
            >
              <span className="drum-pad-label">{pad.shortLabel}</span>
              {isLong && <span className="drum-pad-badge">{t('common.bars4')}</span>}
              {isActive && !isLong && <span className="drum-pad-badge">{t('common.on')}</span>}
              {isSelected && <span className="drum-pad-check">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
