import { useEffect, useCallback, useMemo } from 'react';
import { audioEngine, buildPlayTracks } from '@/audio/engine';
import { useSongStore } from '@/store/songStore';
import type { Layer } from '@/types';
import { getEffectiveSectionCount, getSongDurationFromSong } from '@/types';
import { useI18n } from '@/i18n/LocaleProvider';

interface TransportProps {
  layers: Layer[];
  referenceBpm: number;
  sectionCount: number;
  sectionBpms?: number[];
}

export function Transport({ layers, referenceBpm, sectionCount, sectionBpms }: TransportProps) {
  const { t, formatBpmSections } = useI18n();
  const isPlaying = useSongStore((s) => s.isPlaying);
  const setPlaying = useSongStore((s) => s.setPlaying);

  const effectiveSectionCount = useMemo(
    () => getEffectiveSectionCount({ sectionCount }, layers),
    [sectionCount, layers],
  );

  const resolvedSectionBpms = useMemo(() => {
    const bpms = sectionBpms ?? Array.from({ length: sectionCount }, () => referenceBpm);
    while (bpms.length < effectiveSectionCount) {
      bpms.push(referenceBpm);
    }
    return bpms.slice(0, effectiveSectionCount);
  }, [sectionBpms, sectionCount, effectiveSectionCount, referenceBpm]);

  const tracks = useMemo(
    () => buildPlayTracks(layers, resolvedSectionBpms, referenceBpm),
    [layers, resolvedSectionBpms, referenceBpm],
  );

  const tracksKey = useMemo(
    () => tracks.map((tr) => tr.padId + tr.sectionIndex + tr.pattern.join('')).join('|'),
    [tracks],
  );

  const bpmLabel = useMemo(() => formatBpmSections(resolvedSectionBpms), [resolvedSectionBpms, formatBpmSections]);

  const play = useCallback(async () => {
    if (tracks.length === 0) {
      setPlaying(false);
      return;
    }
    await audioEngine.ensureContext();
    await audioEngine.play(tracks, referenceBpm, effectiveSectionCount, resolvedSectionBpms);
    setPlaying(audioEngine.isPlaying);
  }, [tracks, referenceBpm, effectiveSectionCount, resolvedSectionBpms, setPlaying]);

  const stop = useCallback(() => {
    audioEngine.stop();
    setPlaying(false);
  }, [setPlaying]);

  const toggle = useCallback(async () => {
    if (audioEngine.isPlaying) {
      stop();
      return;
    }
    try {
      await play();
    } catch {
      setPlaying(false);
    }
  }, [play, stop, setPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    if (!audioEngine.isPlaying) {
      setPlaying(false);
      return;
    }
    void audioEngine.play(tracks, referenceBpm, effectiveSectionCount, resolvedSectionBpms)
      .then(() => setPlaying(audioEngine.isPlaying));
  }, [tracksKey, referenceBpm, effectiveSectionCount, resolvedSectionBpms, isPlaying, setPlaying, tracks]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      if (!audioEngine.isPlaying) setPlaying(false);
    }, 250);
    return () => window.clearInterval(timer);
  }, [isPlaying, setPlaying]);

  useEffect(() => () => {
    audioEngine.stop();
    setPlaying(false);
  }, []);

  if (layers.length === 0) return null;

  const duration = getSongDurationFromSong({
    bpm: referenceBpm,
    sectionCount: effectiveSectionCount,
    sectionBpms: resolvedSectionBpms,
    referenceBpm,
  });

  return (
    <div className="transport">
      <button
        type="button"
        className="btn btn-play"
        onClick={toggle}
        aria-label={isPlaying ? t('transport.stopAria') : t('transport.playAria')}
      >
        {isPlaying ? t('transport.stop') : t('transport.play')}
      </button>
      <span className="transport-bpm">{bpmLabel}</span>
      <span className="transport-layers">
        {t('transport.duration', { duration, layers: layers.length })}
      </span>
      {!isPlaying && (
        <p className="transport-hint">{t('transport.hint')}</p>
      )}
    </div>
  );
}
