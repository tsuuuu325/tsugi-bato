import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DrumPadGrid } from '@/components/DrumPadGrid';
import { PadSequencer } from '@/components/PadSequencer';
import { Transport } from '@/components/Transport';
import { LayerStack } from '@/components/LayerStack';
import { AddModePicker } from '@/components/AddModePicker';
import { getFoundationPads, getPadsByGroup, getLongPadsByGenre, getPadById } from '@/data/loops';
import type { PadGroup, LongGenreGroup } from '@/data/loops';
import { useSongStore } from '@/store/songStore';
import type { SongWithLayers, LayerAddMode } from '@/types';
import {
  canAddLayer,
  canUserAddLayer,
  hasUserFinishedContributing,
  getNextPartNumber,
  getContributorCount,
  getLockedAddMode,
  getUserLayers,
  getSectionBpms,
  isCreatorLayeringSession,
  isExtendLayeringSession,
  isMultiSoundLayeringSession,
  isPendingContributionModeChoice,
  getEffectiveSectionCount,
  hasExtendedInCurrentSession,
  canUserExtendSection,
  getLockedTargetSection,
  getReferenceBpm,
  getBarsPerSection,
  getSectionTotalSteps,
  SECTION_SECONDS,
  MIN_BPM,
  MAX_BPM,
} from '@/types';
import { getMaxSections, canPublishToTimeline, canStartDailyExtendSession, canStartDailyLayerSession } from '@/lib/plan';
import { useI18n } from '@/i18n/LocaleProvider';

interface SongEditorProps {
  song: SongWithLayers;
  onSongUpdate: (song: SongWithLayers) => void;
  focusContinue?: boolean;
  readOnly?: boolean;
  /** 参加ページなどから渡す — 最初の足し方 */
  initialAddMode?: LayerAddMode | null;
}

export function SongEditor({
  song,
  onSongUpdate,
  focusContinue = false,
  readOnly = false,
  initialAddMode = null,
}: SongEditorProps) {
  const { t, translateError, formatPart, formatSection, addModeTitle } = useI18n();
  const addLayer = useSongStore((s) => s.addLayer);
  const finishContribution = useSongStore((s) => s.finishContribution);
  const completeSong = useSongStore((s) => s.completeSong);
  const removeLayer = useSongStore((s) => s.removeLayer);
  const updateSectionBpm = useSongStore((s) => s.updateSectionBpm);
  const toggleLayerStep = useSongStore((s) => s.toggleLayerStep);
  const isPlaying = useSongStore((s) => s.isPlaying);
  const deviceId = useSongStore((s) => s.deviceId);
  const [selectedPad, setSelectedPad] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<LayerAddMode | null>(initialAddMode);
  const [targetSectionIndex, setTargetSectionIndex] = useState(0);
  const [message, setMessage] = useState('');

  const maxSections = getMaxSections();
  const sectionBpms = getSectionBpms(song);
  const [sessionBpm, setSessionBpm] = useState(() => sectionBpms[0] ?? song.bpm);
  const usedPadIds = song.layers.map((l) => l.loopId);
  const foundationPads = useMemo(
    () => getFoundationPads().filter((p) => !usedPadIds.includes(p.id)),
    [usedPadIds.join(',')],
  );
  const shortPadGroups: PadGroup[] = ['core', 'phonk', 'edm', 'vocal', 'extra'];
  const padsByGroup = useMemo(
    () => Object.fromEntries(
      shortPadGroups.map((g) => [g, getPadsByGroup(g, usedPadIds)]),
    ) as Record<PadGroup, ReturnType<typeof getPadsByGroup>>,
    [usedPadIds.join(',')],
  );
  const longPadGroups: LongGenreGroup[] = ['phonk', 'edm', 'vocal', 'common'];
  const longPadsByGroup = useMemo(
    () => Object.fromEntries(
      longPadGroups.map((g) => [g, getLongPadsByGenre(g, usedPadIds)]),
    ) as Record<LongGenreGroup, ReturnType<typeof getLongPadsByGenre>>,
    [usedPadIds.join(',')],
  );
  const hasLongPads = longPadGroups.some((g) => longPadsByGroup[g].length > 0);
  const slotsOpen = canAddLayer(song, song.layers);
  const canAdd = !readOnly && canUserAddLayer(song, song.layers, deviceId);
  const alreadyFinished = hasUserFinishedContributing(song, song.layers, deviceId);
  const lockedMode = getLockedAddMode(song, song.layers, deviceId);
  const sessionLayers = getUserLayers(song.layers, deviceId);
  const isCreatorLayering = isCreatorLayeringSession(song, song.layers, deviceId);
  const isExtendLayering = isExtendLayeringSession(song, song.layers, deviceId);
  const isMultiSoundSession = isMultiSoundLayeringSession(song, song.layers, deviceId);
  const effectiveAddMode = isCreatorLayering ? 'layer' : (lockedMode ?? addMode);
  const effectiveSectionCount = getEffectiveSectionCount(song, song.layers, maxSections);
  const extendedInSession = hasExtendedInCurrentSession(song, song.layers, deviceId);
  const canExtend = canUserExtendSection(song, song.layers, deviceId, maxSections)
    && canStartDailyExtendSession();
  const canLayerDaily = canStartDailyLayerSession();
  const lockedTargetSection = getLockedTargetSection(song, song.layers, deviceId);
  const isExtendSession = effectiveAddMode === 'extend' || lockedMode === 'extend';
  const inSession = song.activeContributorId === deviceId && sessionLayers.length > 0;
  const canPickContributionMode = canAdd && isPendingContributionModeChoice(song, song.layers, deviceId);
  const awaitingModePick = canPickContributionMode && !addMode;
  const modeChosen = isMultiSoundSession || lockedMode != null || addMode != null;
  const showBpmControl = canAdd && modeChosen && !awaitingModePick;
  const willCreateNewSection = effectiveAddMode === 'extend' && !extendedInSession;
  const layerTargetIndex = lockedTargetSection ?? targetSectionIndex;
  const activeSectionIndex = isCreatorLayering
    ? 0
    : isExtendLayering
      ? (lockedTargetSection ?? Math.max(0, song.sectionCount - 1))
      : willCreateNewSection
        ? song.sectionCount
        : layerTargetIndex;
  const bpmSectionLabel = formatSection(
    activeSectionIndex >= song.sectionCount ? song.sectionCount : activeSectionIndex,
  );
  const needsAddModeChoice = awaitingModePick;
  const durationSec = effectiveSectionCount * SECTION_SECONDS;
  const maxSongSeconds = maxSections * SECTION_SECONDS;
  const sessionBars = getBarsPerSection(sessionBpm);
  const sessionSteps = getSectionTotalSteps(sessionBpm);
  const selectedInfo = selectedPad ? getPadById(selectedPad) : null;
  const nextPart = getNextPartNumber(song.layers, song);
  const contributorCount = getContributorCount(song.layers);
  const isSolo = song.mode === 'solo';

  const targetSectionLabel = willCreateNewSection
    ? formatSection(song.sectionCount)
    : formatSection(layerTargetIndex);

  const handleModeChange = (mode: LayerAddMode) => {
    setAddMode(mode);
    setMessage('');
    if (mode === 'layer') {
      setTargetSectionIndex(Math.max(0, song.sectionCount - 1));
    } else if (mode === 'extend') {
      setTargetSectionIndex(song.sectionCount);
    }
    requestAnimationFrame(() => {
      document.getElementById('drum-pads')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const deletableLayerIds = useMemo(() => {
    if (song.activeContributorId !== deviceId) return new Set<string>();
    return new Set(
      song.layers
        .filter((l) => !l.isVirtual && l.contributorId === deviceId)
        .map((l) => l.id),
    );
  }, [song.layers, song.activeContributorId, deviceId]);

  const handleBpmChange = (bpm: number) => {
    setSessionBpm(bpm);
    if (!modeChosen) return;
    const result = updateSectionBpm(song.id, activeSectionIndex, bpm);
    if (result.ok) onSongUpdate(result.song);
  };

  useEffect(() => {
    if (!modeChosen) return;
    const pending = song.sectionBpms?.[activeSectionIndex];
    const saved = sectionBpms[Math.min(activeSectionIndex, sectionBpms.length - 1)];
    setSessionBpm(pending ?? saved ?? song.bpm);
  }, [song.id, modeChosen, activeSectionIndex, sectionBpms.join(','), song.sectionBpms?.join(',')]);

  const scrollToPads = useCallback(() => {
    document.getElementById('drum-pads')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (initialAddMode) setAddMode(initialAddMode);
  }, [initialAddMode]);

  useEffect(() => {
    if (!initialAddMode || !canAdd) return;
    requestAnimationFrame(() => {
      document.getElementById('drum-pads')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [initialAddMode, canAdd]);

  useEffect(() => {
    if (lockedMode) setAddMode(lockedMode);
    if (lockedTargetSection != null) setTargetSectionIndex(lockedTargetSection);
  }, [lockedMode, lockedTargetSection]);

  useEffect(() => {
    if (focusContinue && canAdd) {
      const target = awaitingModePick || !modeChosen ? 'editor-toolbar' : 'drum-pads';
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusContinue, canAdd, modeChosen, awaitingModePick]);

  const handleStepToggle = (layerId: string, stepIndex: number) => {
    if (readOnly) return;
    const updated = toggleLayerStep(layerId, stepIndex);
    if (updated) onSongUpdate(updated);
  };

  const handleDeleteLayer = (layerId: string) => {
    setMessage('');
    const result = removeLayer(song.id, layerId);
    if (!result.ok) {
      setMessage(`⚠️ ${translateError(result.reason)}`);
      return;
    }
    onSongUpdate(result.song);
    if (selectedPad && result.song.layers.every((l) => l.loopId !== selectedPad)) {
      setSelectedPad(null);
    }
    setMessage(t('editor.layerRemoved'));
  };

  const handleAdd = () => {
    setMessage('');
    const mode = effectiveAddMode;
    if (needsAddModeChoice && !mode) {
      setMessage(t('editor.warnPickMode'));
      return;
    }
    if (!selectedPad) {
      setMessage(t('editor.warnPickPad'));
      scrollToPads();
      return;
    }
    const prevSectionCount = song.sectionCount;
    const result = addLayer(
      song.id,
      selectedPad,
      mode ?? 'layer',
      showBpmControl ? sessionBpm : undefined,
      mode === 'layer' || isCreatorLayering ? layerTargetIndex : undefined,
    );
    if (!result.ok) {
      setMessage(`⚠️ ${translateError(result.reason)}`);
      return;
    }
    const name = getPadById(selectedPad)?.shortLabel ?? t('editor.padFallback');
    onSongUpdate(result.song);
    setSelectedPad(null);
    if (lockedMode) setAddMode(lockedMode);

    const count = result.song.layers.filter((l) => l.contributorId === deviceId).length;
    if (mode === 'extend' && result.song.sectionCount > prevSectionCount) {
      setMessage(t('editor.sectionExtended', {
        section: formatSection(result.song.sectionCount - 1),
        duration: result.song.sectionCount * SECTION_SECONDS,
      }));
    } else if (result.song.status === 'complete') {
      setMessage(t('editor.addedComplete', { pad: name }));
    } else if (count > 1) {
      setMessage(t('editor.addedMore', { pad: name, count }));
    } else if (isSolo) {
      setMessage(t('editor.addedSolo', { pad: name, mode: addModeTitle(mode ?? 'layer') }));
    } else {
      setMessage(t('editor.addedPart', {
        part: formatPart(nextPart),
        mode: addModeTitle(mode ?? 'layer'),
      }));
    }
  };

  const handleFinish = () => {
    setMessage('');
    const result = finishContribution(song.id);
    if (!result.ok) {
      setMessage(`⚠️ ${translateError(result.reason)}`);
      return;
    }
    onSongUpdate(result.song);
    setAddMode(null);
    if (isSolo) {
      setMessage(t('editor.partCompleteSolo'));
    } else if (isCreatorLayering) {
      setMessage(t('editor.partCompleteNext'));
    } else {
      setMessage(t('editor.partCompleteNext'));
    }
  };

  const handlePublish = () => {
    setMessage('');
    const result = completeSong(song.id);
    if (!result.ok) {
      setMessage(`⚠️ ${translateError(result.reason)}`);
      return;
    }
    onSongUpdate(result.song);
    setMessage(t('song.publishedSuccess'));
  };

  const showPublish = song.status !== 'complete' && canPublishToTimeline(song.sectionCount);

  return (
    <div className="song-editor">
      {message && (
        <div className={`message-box ${message.startsWith('✅') ? 'message-box--ok' : 'message-box--warn'}`}>
          {message}
        </div>
      )}

      <section className="continue-section">
        <div className="continue-section-header">
          <h2 className="section-title">{t('editor.stackTitle')}</h2>
          <span className="continue-progress">
            {t('editor.stackProgress', {
              duration: durationSec,
              max: maxSongSeconds,
              layers: song.layers.length,
              contributors: contributorCount,
              maxContributors: song.maxContributors,
            })}
          </span>
        </div>
        <LayerStack
          layers={song.layers}
          sectionCount={song.sectionCount}
          maxContributors={song.maxContributors}
          sectionBpms={sectionBpms}
          onEmptySlotClick={canAdd && !inSession ? scrollToPads : undefined}
          deletableLayerIds={deletableLayerIds}
          onDeleteLayer={canAdd ? handleDeleteLayer : undefined}
        />
      </section>

      <PadSequencer
        layers={song.layers}
        sectionCount={effectiveSectionCount}
        sectionBpms={sectionBpms}
        isPlaying={isPlaying}
        onStepToggle={handleStepToggle}
      />

      <Transport
        layers={song.layers}
        referenceBpm={getReferenceBpm(song)}
        sectionCount={effectiveSectionCount}
        sectionBpms={sectionBpms}
      />

      {showPublish && (
        <div className="editor-publish-bar">
          <p className="hint hint--compact">{t('plan.timelineCanPublish')}</p>
          <button type="button" className="btn btn-primary btn-large" onClick={handlePublish}>
            {t('song.completeToFeed')}
          </button>
        </div>
      )}

      {slotsOpen && canAdd && (
        <section className="editor-toolbar" id="editor-toolbar">
          <p className="editor-toolbar-label">
            {isCreatorLayering
              ? t('editor.foundationLayering', { count: sessionLayers.length })
              : isExtendLayering
                ? t('editor.extendLayering', {
                    section: formatSection(lockedTargetSection ?? Math.max(0, song.sectionCount - 1)),
                    count: sessionLayers.length,
                  })
                : inSession
                  ? t('editor.partAdding', { count: sessionLayers.length })
                  : isSolo
                    ? t('editor.soloPickMode')
                    : t('editor.yourPart', { part: formatPart(nextPart) })}
          </p>

          {!isMultiSoundSession && (
            <AddModePicker
              value={addMode}
              onChange={handleModeChange}
              currentSectionCount={song.sectionCount}
              lockedMode={lockedMode}
              canLayer={canLayerDaily}
              canExtend={canExtend}
              disabled={!canAdd}
              compact={!canPickContributionMode}
            />
          )}

          {awaitingModePick && (
            <p className="hint hint--compact editor-pick-mode-hint">{t('editor.pickModeFirst')}</p>
          )}

          {modeChosen && effectiveAddMode === 'layer' && song.sectionCount > 0 && !isMultiSoundSession && (
            <div className="section-target-picker">
              <p className="label">{t('editor.pickSection')}</p>
              <div className="section-target-grid">
                {Array.from({ length: song.sectionCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`section-target-btn ${layerTargetIndex === i ? 'section-target-btn--active' : ''}`}
                    onClick={() => setTargetSectionIndex(i)}
                    disabled={lockedTargetSection != null}
                  >
                    {formatSection(i)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {modeChosen && (
            <p className="editor-target-hint">
              {willCreateNewSection
                ? t('editor.targetExtend', { section: targetSectionLabel })
                : t('editor.targetLayer', { section: targetSectionLabel })}
            </p>
          )}

          {lockedMode === 'layer' && canExtend && isSolo && (
            <p className="hint hint--compact editor-extend-hint">
              {t('editor.finishToExtend')}
            </p>
          )}
          {!canExtend && !isMultiSoundSession && song.mode !== 'solo' && (
            <p className="hint hint--compact editor-extend-hint">
              {t('editor.extendOnceOnly')}
            </p>
          )}

          {showBpmControl && (
            <div className="editor-bpm-inline">
              <label className="label" htmlFor="session-bpm">
                {t('section.speed', { label: bpmSectionLabel })}
              </label>
              <div className="bpm-control">
                <input
                  id="session-bpm"
                  type="range"
                  min={MIN_BPM}
                  max={MAX_BPM}
                  value={sessionBpm}
                  onChange={(e) => handleBpmChange(Number(e.target.value))}
                />
                <span className="bpm-value">{sessionBpm}</span>
              </div>
              <p className="hint hint--compact">
                {t('section.fixedHint', { bpm: sessionBpm, steps: sessionSteps, bars: sessionBars })}
              </p>
            </div>
          )}
        </section>
      )}

      {slotsOpen && !canAdd && alreadyFinished && !readOnly && (
        <div className="alert-box">{t('editor.thanksDone')}</div>
      )}

      {slotsOpen && !canAdd && song.activeContributorId && song.activeContributorId !== deviceId && (
        <div className="alert-box">{t('editor.waitForOther')}</div>
      )}

      {canAdd && modeChosen && !awaitingModePick && (
        <section className="section editor-pads-section" id="drum-pads">
          {isExtendSession && foundationPads.length > 0 && (
            <>
              <h2 className="section-title">{t('editor.foundationPads')}</h2>
              <DrumPadGrid
                pads={foundationPads}
                selectedId={selectedPad}
                onSelect={setSelectedPad}
                activePadIds={usedPadIds}
                columns={2}
              />
            </>
          )}

          <h2 className="section-title">{isExtendSession ? t('editor.otherPads') : t('editor.pickPads')}</h2>
          {shortPadGroups.map((group) => {
            const pads = padsByGroup[group];
            if (pads.length === 0) return null;
            return (
              <div key={group} className="pad-group">
                <h3 className="section-subtitle">{t(`pads.short.${group}`)}</h3>
                <DrumPadGrid
                  pads={pads}
                  selectedId={selectedPad}
                  onSelect={setSelectedPad}
                  activePadIds={usedPadIds}
                />
              </div>
            );
          })}

          {hasLongPads && (
            <>
              <h2 className="section-title section-title--long">{t('editor.longPads')}</h2>
              {longPadGroups.map((group) => {
                const pads = longPadsByGroup[group];
                if (pads.length === 0) return null;
                return (
                  <div key={group} className="pad-group">
                    <h3 className="section-subtitle">{t(`pads.long.${group}`)}</h3>
                    <DrumPadGrid
                      pads={pads}
                      selectedId={selectedPad}
                      onSelect={setSelectedPad}
                      activePadIds={usedPadIds}
                      columns={2}
                    />
                  </div>
                );
              })}
            </>
          )}

          <div className="editor-actions">
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handleAdd}
              disabled={!selectedPad}
            >
              {selectedInfo
                ? t('editor.confirmSound', { pad: selectedInfo.shortLabel })
                : t('editor.confirmSoundPick')}
            </button>
            {inSession && (
              <button type="button" className="btn btn-secondary" onClick={handleFinish}>
                {song.mode === 'collab' && !isSolo ? t('editor.finishPass') : t('editor.finishShort')}
              </button>
            )}
          </div>
        </section>
      )}

      {canAdd && awaitingModePick && (
        <p className="hint hint--compact editor-pick-mode-hint editor-pick-mode-hint--below">
          {t('editor.pickModeBeforePads')}
        </p>
      )}

      {song.status === 'complete' && (
        <p className="hint">
          {t('song.publishedOnTimeline')}
          {' '}
          <Link to="/timeline" className="inline-link">{t('common.timelineLink')}</Link>
          {' '}
          {t('song.publishedOnTimelineEnd')}
        </p>
      )}
    </div>
  );
}
