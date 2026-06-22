import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { SongEditor } from '@/components/SongEditor';
import { ContributorLinks } from '@/components/ContributorLinks';
import { CommentThread } from '@/components/CommentThread';
import { ShareButton } from '@/components/ShareButton';
import { useSongStore } from '@/store/songStore';
import {
  canAddLayer,
  canUserAddLayer,
  getNextPartNumber,
  getContributorCount,
  getSectionBpms,
  getEffectiveSectionCount,
  MIN_BPM,
  MAX_BPM,
  DEFAULT_BPM,
} from '@/types';
import { useI18n } from '@/i18n/LocaleProvider';
import { getMaxSections, canPublishToTimeline, canUserContributeToday } from '@/lib/plan';

export function SongPage() {
  const { t, translateError, formatPart, formatBpmSections } = useI18n();
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const init = useSongStore((s) => s.init);
  const loadSongByCode = useSongStore((s) => s.loadSongByCode);
  const completeSong = useSongStore((s) => s.completeSong);
  const updateExampleBpm = useSongStore((s) => s.updateExampleBpm);
  const deviceId = useSongStore((s) => s.deviceId);
  const username = useSongStore((s) => s.username);
  const avatarEmoji = useSongStore((s) => s.avatarEmoji);
  const [song, setSong] = useState(() => (code ? loadSongByCode(code) : null));
  const [publishTitle, setPublishTitle] = useState('');
  const [publishMessage, setPublishMessage] = useState('');
  const [exampleBpm, setExampleBpm] = useState(DEFAULT_BPM);
  const focusContinue = searchParams.get('continue') === '1';

  useEffect(() => {
    init();
    if (code) setSong(loadSongByCode(code));
  }, [code, init, loadSongByCode]);

  useEffect(() => {
    if (song) setPublishTitle(song.title);
  }, [song?.id, song?.title]);

  useEffect(() => {
    if (!song?.isExample) return;
    const bpms = getSectionBpms(song);
    setExampleBpm(bpms[0] ?? song.bpm);
  }, [song?.id, song?.bpm, song?.sectionBpms?.join(',')]);

  const handleExampleBpmChange = (bpm: number) => {
    if (!song?.isExample) return;
    setExampleBpm(bpm);
    const result = updateExampleBpm(song.id, bpm);
    if (result.ok) setSong(result.song);
  };

  const handlePublish = () => {
    if (!song) return;
    setPublishMessage('');
    const result = completeSong(song.id, publishTitle);
    if (!result.ok) {
      setPublishMessage(`⚠️ ${translateError(result.reason)}`);
      return;
    }
    setSong(result.song);
    setPublishMessage(t('song.publishedSuccess'));
  };

  if (!song) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>{t('song.notFound')}</p>
          <Link to="/" className="btn btn-primary">{t('common.homeLink')}</Link>
        </div>
      </div>
    );
  }

  const isComplete = song.status === 'complete';
  const slotsOpen = canAddLayer(song, song.layers);
  const canContinue = canUserAddLayer(song, song.layers, deviceId)
    && canUserContributeToday(deviceId, song);
  const nextPart = getNextPartNumber(song.layers, song);
  const effectiveSections = getEffectiveSectionCount(song, song.layers, getMaxSections());
  const sectionBpms = getSectionBpms(song);
  const bpmDisplay = formatBpmSections(sectionBpms);
  const canPublish = !isComplete && canPublishToTimeline(song.sectionCount);

  return (
    <div className="page song-page">
      <div className="song-header">
        <h1 className="page-title">{song.title}</h1>
        <div className="song-badges">
          {isComplete && <span className="badge badge--complete">{t('song.complete')}</span>}
          {song.mode === 'virtual' && <span className="badge badge--virtual">{t('song.virtual')}</span>}
          {song.mode === 'solo' && <span className="badge badge--open">{t('song.solo')}</span>}
          {song.isExample && <span className="badge badge--example">{t('home.exampleBadge')}</span>}
          {slotsOpen && !isComplete && (
            <span className="badge badge--continue">{t('part.next', { part: formatPart(nextPart) })}</span>
          )}
        </div>
      </div>

      <p className="page-desc">
        {t('song.meta', {
          bpm: bpmDisplay,
          duration: effectiveSections * 10,
          layers: song.layers.filter((l) => !l.isVirtual).length,
          contributors: getContributorCount(song.layers),
          max: song.maxContributors,
          creator: song.creatorName,
        })}
      </p>

      {getContributorCount(song.layers) > 0 && (
        <div className="song-credits">
          <span className="song-credits-label">{t('timeline.withLabel')}</span>
          <ContributorLinks layers={song.layers} className="song-credits-links" separator={t('timeline.contributorSeparator')} inline />
        </div>
      )}

      {!isComplete && !canContinue && canUserAddLayer(song, song.layers, deviceId) && (
        <p className="hint hint--compact">{t('plan.dailyBothExhausted')}</p>
      )}

      {!isComplete && !canPublish && (
        <p className="hint hint--compact">{t('plan.timelineNeedSections')}</p>
      )}
      {canPublish && (
        <p className="hint hint--compact">{t('plan.timelineCanPublish')}</p>
      )}

      {song.isExample && (
        <section className="card example-bpm-card">
          <label className="label" htmlFor="example-bpm">
            {t('song.exampleBpmLabel', { min: MIN_BPM, max: MAX_BPM })}
          </label>
          <div className="bpm-control">
            <input
              id="example-bpm"
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={exampleBpm}
              onChange={(e) => handleExampleBpmChange(Number(e.target.value))}
            />
            <span className="bpm-value">{exampleBpm}</span>
          </div>
          <p className="hint hint--compact">{t('song.exampleBpmHint')}</p>
        </section>
      )}

      {publishMessage && (
        <div className={`message-box ${publishMessage.startsWith('✅') ? 'message-box--ok' : 'message-box--warn'}`}>
          {publishMessage}
        </div>
      )}

      {canPublish && (
        <section className="card publish-card">
          <label className="label" htmlFor="publish-title">{t('song.publishTitleLabel')}</label>
          <input
            id="publish-title"
            type="text"
            className="input"
            value={publishTitle}
            onChange={(e) => setPublishTitle(e.target.value)}
            maxLength={40}
            placeholder={t('app.defaultBeatTitle')}
          />
          <p className="hint hint--compact">{t('song.publishTitleHint')}</p>
          <button type="button" className="btn btn-primary btn-large" onClick={handlePublish}>
            {t('song.completeToFeed')}
          </button>
        </section>
      )}

      <SongEditor
        song={song}
        onSongUpdate={setSong}
        focusContinue={focusContinue || (canContinue && song.activeContributorId === deviceId)}
        readOnly={isComplete || !canContinue}
      />

      {isComplete && (
        <ShareButton shareCode={song.shareCode} title={song.title} />
      )}

      {isComplete && (
        <CommentThread songId={song.id} username={username} avatarEmoji={avatarEmoji} />
      )}
    </div>
  );
}
