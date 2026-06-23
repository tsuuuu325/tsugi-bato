import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Transport } from '@/components/Transport';
import { useSongStore } from '@/store/songStore';
import { useI18n } from '@/i18n/LocaleProvider';
import {
  getFeedMySongs,
  getLocalMySongs,
  mergeMySongs,
  mySongMeta,
  type MySongEntry,
} from '@/lib/mySongs';
import { getReferenceBpm } from '@/types';
import { getLocalSyncCode, getShareUrlWithSync } from '@/lib/deviceSync';
import { isSupabaseConfigured } from '@/lib/supabase';

export function MyPage() {
  const { t, formatBpmSections } = useI18n();
  const init = useSongStore((s) => s.init);
  const deviceId = useSongStore((s) => s.deviceId);
  const username = useSongStore((s) => s.username);
  const setUser = useSongStore((s) => s.setUser);
  const [nameInput, setNameInput] = useState('');
  const [songs, setSongs] = useState<MySongEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const nameLocked = Boolean(username.trim());

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (username) setNameInput(username); }, [username]);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    setLoading(true);
    const local = getLocalMySongs(deviceId);
    void getFeedMySongs(deviceId).then((feed) => {
      if (cancelled) return;
      setSongs(mergeMySongs(local, feed));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [deviceId]);

  const handleSaveProfile = () => {
    if (nameLocked) return;
    if (nameInput.trim()) setUser(nameInput.trim());
  };

  const syncCode = getLocalSyncCode();
  const showSync = isSupabaseConfigured();

  const copySyncUrl = async () => {
    const url = getShareUrlWithSync('/');
    try {
      await navigator.clipboard.writeText(url);
      alert(t('my.syncCopied'));
    } catch {
      prompt(t('share.copyPrompt'), url);
    }
  };

  return (
    <div className="page my-page">
      <h1 className="page-title">{t('my.title')}</h1>
      <p className="page-desc">{t('my.desc')}</p>

      <section className="card profile-card profile-card--simple">
        {nameLocked ? (
          <>
            <p className="label">{t('my.displayName')}</p>
            <p className="my-profile-name">{username}</p>
          </>
        ) : (
          <>
            <label className="label" htmlFor="my-username">{t('home.displayNameOnce')}</label>
            <div className="input-row">
              <input
                id="my-username"
                type="text"
                className="input"
                placeholder={t('home.nicknamePlaceholder')}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={20}
              />
              <button type="button" className="btn btn-primary" onClick={handleSaveProfile}>
                {t('common.save')}
              </button>
            </div>
            <p className="hint hint--compact">{t('home.nameLockHint')}</p>
          </>
        )}
      </section>

      {showSync && (
        <section className="card sync-card">
          <h2 className="section-title">{t('my.syncTitle')}</h2>
          <p className="hint hint--compact">{t('my.syncDesc')}</p>
          {syncCode && (
            <p className="sync-code-row">
              <span className="label">{t('my.syncCodeLabel')}</span>
              <span className="share-value">{syncCode}</span>
            </p>
          )}
          <button type="button" className="btn btn-secondary" onClick={copySyncUrl}>
            {t('my.syncCopyHome')}
          </button>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">{t('my.songsTitle')}</h2>
        {loading && <p className="hint">{t('common.loading')}</p>}
        {!loading && songs.length === 0 && (
          <div className="empty-state">
            <p>{t('my.empty')}</p>
            <Link to="/create" className="btn btn-primary">{t('timeline.startBeat')}</Link>
          </div>
        )}
        <div className="my-song-list">
          {songs.map((entry) => {
            const meta = mySongMeta(entry);
            const bpmDisplay = formatBpmSections(meta.sectionBpms);
            return (
              <article key={entry.id} className="my-song-card card">
                <div className="my-song-card-header">
                  <div>
                    <h3 className="my-song-title">{entry.title}</h3>
                    <p className="my-song-meta">
                      {bpmDisplay} · {meta.sectionCount * 10}{t('common.seconds')}
                      {entry.status === 'open' && ` · ${t('my.inProgress')}`}
                    </p>
                    {meta.contributorNames && (
                      <p className="my-song-credits">
                        {t('timeline.withContributors', { names: meta.contributorNames })}
                      </p>
                    )}
                  </div>
                  <Link to={`/song/${entry.shareCode}`} className="btn btn-secondary btn-sm">
                    {t('feed.songPage')}
                  </Link>
                </div>
                <Transport
                  layers={entry.layers}
                  referenceBpm={getReferenceBpm(entry)}
                  sectionCount={meta.sectionCount}
                  sectionBpms={meta.sectionBpms}
                />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
