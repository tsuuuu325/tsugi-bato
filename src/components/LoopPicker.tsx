import type { LoopDefinition } from '@/types';
import { CATEGORY_LABELS } from '@/types';

interface LoopPickerProps {
  loops: LoopDefinition[];
  selectedId: string | null;
  onSelect: (loopId: string) => void;
  disabledIds?: string[];
}

export function LoopPicker({
  loops,
  selectedId,
  onSelect,
  disabledIds = [],
}: LoopPickerProps) {
  if (loops.length === 0) {
    return (
      <div className="loop-picker-empty">
        <p>選べるループがありません</p>
      </div>
    );
  }

  const categories = [...new Set(loops.map((l) => l.category))];

  return (
    <div className="loop-picker" id="loop-picker">
      {categories.map((cat) => {
        const catLoops = loops.filter((l) => l.category === cat);
        return (
          <div key={cat} className="loop-category">
            <h3 className="loop-category-title">{CATEGORY_LABELS[cat]}</h3>
            <div className="loop-grid">
              {catLoops.map((loop) => {
                const disabled = disabledIds.includes(loop.id);
                const selected = selectedId === loop.id;
                return (
                  <div
                    key={loop.id}
                    role="button"
                    tabIndex={0}
                    className={`loop-card ${selected ? 'loop-card--selected' : ''} ${disabled ? 'loop-card--disabled' : ''}`}
                    style={{ '--loop-color': loop.color } as React.CSSProperties}
                    onClick={() => {
                      if (!disabled) onSelect(loop.id);
                    }}
                    onKeyDown={(e) => {
                      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onSelect(loop.id);
                      }
                    }}
                  >
                    <span className="loop-card-icon">{loop.shortLabel}</span>
                    {selected && <span className="loop-card-check">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
