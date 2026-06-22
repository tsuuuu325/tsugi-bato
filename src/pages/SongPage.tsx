import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { SongEditor } from '@/components/SongEditor';
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
  const [publishMessage, setPublishMessage] = useState('');
  const focusContinue = searchParams.get('continue') === '1';

  const handlePublish = () => {
    if (!song) return;
    setPublishMessage('');
    const result = completeSong(song.id);
    if (!result.ok) {
      setPublishMessage(`⚠️ ${translateError(result.reason)}`);
      return;
    }
    setSong(result.song);
    setPublishMessage(t('song.publishedSuccess'));
  };

  useEffect(() => {
    init();
    if (code) setSong(loadSongByCode(code));
  }, [code, init, loadSongByCode]);

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
          layers: song.layers.length,
          contributors: getContributorCount(song.layers),
          max: song.maxContributors,
          creator: song.creatorName,
        })}
      </p>

      {!isComplete && !canContinue && canUserAddLayer(song, song.layers, deviceId) && (
        <p className="hint hint--compact">{t('plan.dailyBothExhausted')}</p>
      )}

      {!isComplete && !canPublishToTimeline(song.sectionCount) && (
        <p className="hint hint--compact">{t('plan.timelineNeedSections')}</p>
      )}
      {!isComplete && canPublishToTimeline(song.sectionCount) && (
        <p className="hint hint--compact">{t('plan.timelineCanPublish')}</p>
      )}

      {publishMessage && (
        <div className={`message-box ${publishMessage.startsWith('✅') ? 'message-box--ok' : 'message-box--warn'}`}>
          {publishMessage}
        </div>
      )}

      {!isComplete && canPublishToTimeline(song.sectionCount) && (
        <button type="button" className="btn btn-primary btn-large" onClick={handlePublish}>
          {t('song.completeToFeed')}
        </button>
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
