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
  const deviceId = useSongStore((s) => s.deviceId);
  const username = useSongStore((s) => s.username);
  const avatarEmoji = useSongStore((s) => s.avatarEmoji);
  const [song, setSong] = useState(() => (code ? loadSongByCode(code) : null));
  const [publishTitle, setPublishTitle] = useState('');
  const [publishMessage, setPublishMessage] = useState('');
  const focusContinue = searchParams.get('continue') === '1';

  useEffect(() => {
    init();
    if (code) setSong(loadSongByCode(code));
  }, [code, init, loadSongByCode]);

  useEffect(() => {
    if (song) setPublishTitle(song.title);
  }, [song?.id, song?.title]);

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
