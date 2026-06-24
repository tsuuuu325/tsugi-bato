import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSongStore } from '@/store/songStore';
import { canAddLayer, canUserAddLayer, getNextPartNumber, getContributorCount } from '@/types';
import { getLoopById } from '@/data/loops';
import { Avatar } from '@/components/Avatar';
import { useI18n } from '@/i18n/LocaleProvider';
import { useAuth } from '@/auth/AuthProvider';
import { creationRequiresLogin, loginPathFor } from '@/lib/authGate';

export function CollaboratePage() {
  const { t, formatPart } = useI18n();
  const { isLoggedIn } = useAuth();
  const authGate = creationRequiresLogin();
  const hrefForCreate = (path: string) => (authGate && !isLoggedIn ? loginPathFor(path) : path);
  const openSongs = useSongStore((s) => s.openSongs);
  const deviceId = useSongStore((s) => s.deviceId);
  const init = useSongStore((s) => s.init);

  useEffect(() => { init(); }, []);

  const joinable = openSongs.filter(
    (s) => canAddLayer(s, s.layers) && canUserAddLayer(s, s.layers, deviceId),
  );

  return (
    <div className="page collaborate-page">
      <h1 className="page-title">{t('collaborate.title')}</h1>
      <p className="page-desc">{t('collaborate.desc')}</p>

      {joinable.length === 0 ? (
        <div className="empty-state">
          <p>{t('collaborate.empty')}</p>
          <Link to={hrefForCreate('/create')} className="btn btn-primary">{t('collaborate.createFoundation')}</Link>
          <Link to="/timeline" className="btn btn-secondary">{t('collaborate.viewTimeline')}</Link>
        </div>
      ) : (
        <div className="collab-list">
          {joinable.map((song) => {
            const foundation = getLoopById(song.layers[0]?.loopId);
            const nextPart = getNextPartNumber(song.layers, song);
            const contributorCount = getContributorCount(song.layers);
            return (
              <div key={song.id} className="collab-card">
                <div className="collab-card-header">
                  <span
                    className="collab-icon collab-icon--label"
                    style={{ background: foundation?.color ?? '#666' }}
                  >
                    {foundation?.shortLabel ?? '?'}
                  </span>
                  <div>
                    <h3>{song.title}</h3>
                    <p>
                      {t('collaborate.meta', {
                        bpm: song.bpm,
                        part: formatPart(nextPart),
                        creator: song.creatorName,
                      })}
                    </p>
                  </div>
                </div>
                <div className="collab-layers">
                  {song.layers.map((l) => {
                    const loop = getLoopById(l.loopId);
                    return (
                      <span key={l.id} className="collab-layer-chip-wrap" title={`${l.contributorName} ${loop?.shortLabel}`}>
                        <Avatar emoji={l.contributorAvatar ?? '🎧'} size="sm" />
                        <span className="collab-layer-chip" style={{ background: loop?.color ?? '#444' }}>
                          {loop?.shortLabel ?? '?'}
                        </span>
                      </span>
                    );
                  })}
                  {Array.from({ length: song.maxContributors - contributorCount }).map((_, i) => (
                    <span key={`empty-${i}`} className="collab-layer-chip collab-layer-chip--empty">
                      {i === 0 ? formatPart(nextPart) : '+'}
                    </span>
                  ))}
                </div>
                <div className="collab-card-actions">
                  <Link to={hrefForCreate(`/add/${song.shareCode}`)} className="collab-cta">
                    {t('part.addPartContinue', { part: formatPart(nextPart) })}
                  </Link>
                  <Link to={`/song/${song.shareCode}`} className="collab-cta collab-cta--muted">
                    {t('common.listen')}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
