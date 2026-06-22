import { useEffect, useState } from 'react';
import { getPadById } from '@/data/loops';
import { resolveLayerPattern, audioEngine } from '@/audio/engine';
import type { PlaybackPosition } from '@/audio/engine';
import type { Layer } from '@/types';
import {
  STEPS_PER_BAR,
  getBarsPerSection,
  getSectionTotalSteps,
} from '@/types';
import { useI18n } from '@/i18n/LocaleProvider';

interface PadSequencerProps {
  layers: Layer[];
  sectionCount: number;
  sectionBpms?: number[];
  isPlaying: boolean;
  onStepToggle: (layerId: string, stepIndex: number) => void;
}

export function PadSequencer({ layers, sectionCount, sectionBpms, isPlaying, onStepToggle }: PadSequencerProps) {
  const { t, formatSection } = useI18n();
  const [playback, setPlayback] = useState<PlaybackPosition>({ section: -1, step: -1 });

  useEffect(() => {
    if (!isPlaying) {
      setPlayback({ section: -1, step: -1 });
      return;
    }
    const unsub = audioEngine.onStep((pos) => setPlayback(pos));
    return unsub;
  }, [isPlaying, layers.map((l) => l.id + (l.pattern?.join('') ?? '')).join('|')]);

  if (layers.length === 0) return null;

  return (
    <div className="pad-sequencer">
      <div className="seq-header">
        <span className="seq-label">{t('sequencer.title', { sections: sectionCount })}</span>
        <p className="seq-hint">{t('sequencer.hint')}</p>
      </div>

      {Array.from({ length: sectionCount }, (_, si) => {
        const sectionLayers = layers.filter((l) => l.sectionIndex === si);
        if (sectionLayers.length === 0) return null;
        const isActiveSection = playback.section === si;
        const sectionBpm = sectionBpms?.[si];
        const totalSteps = sectionBpm != null ? getSectionTotalSteps(sectionBpm) : STEPS_PER_BAR;
        const bars = sectionBpm != null ? getBarsPerSection(sectionBpm) : 1;

        return (
          <div key={si} className={`seq-section ${isActiveSection ? 'seq-section--active' : ''}`}>
            <p className="seq-section-label">
              {formatSection(si)}
              {sectionBpm != null && (
                <span className="seq-section-bars">
                  {t('sequencer.sectionMeta', { bpm: sectionBpm, steps: totalSteps, bars })}
                </span>
              )}
            </p>
            <div className="seq-scroll">
              <div className="seq-steps-label-row">
                <span className="seq-label" />
                <div className="seq-steps-label">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <span
                      key={i}
                      className={`seq-num ${isActiveSection && playback.step === i ? 'seq-num--now' : ''} ${i > 0 && i % STEPS_PER_BAR === 0 ? 'seq-num--bar' : ''}`}
                    >
                      {i % STEPS_PER_BAR === 0 ? `${i / STEPS_PER_BAR + 1}` : ''}
                    </span>
                  ))}
                </div>
              </div>
              {sectionLayers.map((layer) => {
                const pad = getPadById(layer.loopId);
                const pattern = resolveLayerPattern(layer.loopId, layer.pattern, sectionBpm);
                if (!pad) return null;
                return (
                  <div key={layer.id} className="seq-row">
                    <span className="seq-pad-name" style={{ color: pad.color }} title={pad.shortLabel}>
                      {pad.shortLabel}
                    </span>
                    <div className="seq-steps">
                      {pattern.map((hit, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`seq-step ${hit ? 'seq-step--on' : ''} ${isActiveSection && playback.step === i ? 'seq-step--now' : ''} ${i > 0 && i % STEPS_PER_BAR === 0 ? 'seq-step--bar' : ''}`}
                          style={hit ? { background: pad.color, borderColor: pad.color } : undefined}
                          onClick={() => onStepToggle(layer.id, i)}
                          aria-label={t('sequencer.stepAria', { pad: pad.shortLabel, step: i + 1 })}
                        />
                      ))}
                    </div>
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
