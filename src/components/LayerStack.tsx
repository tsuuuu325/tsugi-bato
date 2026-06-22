import type { Layer } from '@/types';
import { getLoopById } from '@/data/loops';
import {
  getSectionTotalSteps,
  getBarsPerSection,
  getContributorIds,
  getLayerContributorKey,
} from '@/types';
import { Avatar } from '@/components/Avatar';
import { useI18n } from '@/i18n/LocaleProvider';

interface LayerStackProps {
  layers: Layer[];
  sectionCount: number;
  maxContributors: number;
  sectionBpms?: number[];
  onEmptySlotClick?: () => void;
  deletableLayerIds?: Set<string>;
  onDeleteLayer?: (layerId: string) => void;
}

export function LayerStack({
  layers,
  sectionCount,
  maxContributors,
  sectionBpms,
  onEmptySlotClick,
  deletableLayerIds,
  onDeleteLayer,
}: LayerStackProps) {
  const { t, formatPart, formatSection, addModeTitle } = useI18n();
  const contributorIds = getContributorIds(layers);
  const nextContributorIndex = contributorIds.length;

  const sections = Array.from({ length: sectionCount }, (_, si) => ({
    index: si,
    label: formatSection(si),
    bpm: sectionBpms?.[si],
    layers: layers.filter((l) => l.sectionIndex === si),
  }));

  const contributors = contributorIds.map((key, ci) => {
    const contributorLayers = layers.filter(
      (l) => !l.isVirtual && getLayerContributorKey(l) === key,
    );
    const first = contributorLayers[0];
    return {
      key,
      index: ci,
      name: first?.contributorName ?? '?',
      avatar: first?.contributorAvatar ?? '🎧',
      layers: contributorLayers,
      addMode: first?.addMode ?? 'layer',
    };
  });

  return (
    <div className="layer-stack">
      {sections.map((section) => (
        <div key={section.index} className="layer-section-group">
          <h3 className="layer-section-title">
            {section.label}
            {section.bpm != null && (
              <span className="layer-section-bpm">
                {' '}
                · {section.bpm} BPM · {getSectionTotalSteps(section.bpm)} {t('common.steps')}
                ({getBarsPerSection(section.bpm)} {t('common.bars')})
              </span>
            )}
          </h3>
          {section.layers.map((layer) => {
            const loop = getLoopById(layer.loopId);
            const contributorIdx = contributorIds.indexOf(getLayerContributorKey(layer));
            const partNum = contributorIdx >= 0 ? contributorIdx + 1 : layers.indexOf(layer) + 1;
            const canDelete = deletableLayerIds?.has(layer.id) && onDeleteLayer;
            return (
              <div
                key={layer.id}
                className={`layer-slot ${layer.isVirtual ? 'layer-slot--virtual' : ''}`}
                style={{ '--layer-color': loop?.color ?? '#666' } as React.CSSProperties}
              >
                <span className="layer-index">{formatPart(partNum)}</span>
                <Avatar emoji={layer.contributorAvatar ?? '🎧'} size="sm" label={layer.contributorName} />
                <span className="layer-icon layer-icon--label" style={{ background: loop?.color ?? '#666' }}>
                  {loop?.shortLabel ?? '?'}
                </span>
                <div className="layer-info">
                  <span className="layer-meta">
                    {addModeTitle(layer.addMode)} · {layer.contributorName}
                    {layer.isVirtual && ` (${t('common.auto')})`}
                  </span>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    className="layer-delete-btn"
                    onClick={() => onDeleteLayer(layer.id)}
                    aria-label={t('editor.deleteLayer', { pad: loop?.shortLabel ?? '?' })}
                    title={t('editor.deleteLayer', { pad: loop?.shortLabel ?? '?' })}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {Array.from({ length: maxContributors - contributors.length }, (_, i) => {
        const slotNum = nextContributorIndex + i + 1;
        const isNext = i === 0;
        return (
          <button
            key={`empty-${slotNum}`}
            type="button"
            className={`layer-slot layer-slot--empty ${isNext ? 'layer-slot--next' : ''}`}
            onClick={onEmptySlotClick}
            disabled={!onEmptySlotClick || !isNext}
          >
            <span className="layer-index">{formatPart(slotNum)}</span>
            <span className="layer-empty-text">
              {isNext ? t('part.nextPerson', { part: formatPart(slotNum) }) : t('common.empty')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
