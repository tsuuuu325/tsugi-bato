import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { ContributorLinks } from '@/components/ContributorLinks';
import { Transport } from '@/components/Transport';
import { useSongStore } from '@/store/songStore';
import { useI18n } from '@/i18n/LocaleProvider';
import {
  contributorSongMeta,
  fetchContributorProfile,
  type ContributorProfile,
} from '@/lib/contributorProfile';
import { getReferenceBpm } from '@/types';

export function ContributorProfilePage() {
  const { contributorKey = '' } = useParams<{ contributorKey: string }>();
  const { t, formatBpmSections } = useI18n();
  const init = useSongStore((s) => s.init);
  const deviceId = useSongStore((s) => s.deviceId);
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!contributorKey) {
      setMissing(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setMissing(false);
    void fetchContributorProfile(contributorKey).then((result) => {
      if (cancelled) return;
      setProfile(result);
      setMissing(!result);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [contributorKey]);

  const isSelf = Boolean(deviceId && profile && profile.id === deviceId);

  if (loading) {
    return (
      <div className="page profile-page">
        <p className="hint">{t('common.loading')}</p>
      </div>
    );
  }

  if (missing || !profile) {
    return (
      <div className="page profile-page">
        <div className="empty-state">
          <p>{t('profile.notFound')}</p>
          <Link to="/timeline" className="btn btn-primary">{t('timeline.title')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page profile-page">
      <h1 className="page-title">{t('profile.title', { name: profile.name })}</h1>
      <p className="page-desc">{t('profile.desc')}</p>

      <section className="card profile-card profile-card--public">
        <div className="profile-public-header">
          <Avatar emoji={profile.avatar} size="lg" label={profile.name} />
          <div>
            <p className="my-profile-name">{profile.name}</p>
            {isSelf && (
              <Link to="/me" className="profile-self-link">{t('profile.viewMyPage')}</Link>
            )}
          </div>
        </div>
        <p className="profile-like-count">
          <span className="profile-like-icon" aria-hidden>❤️</span>
          {t('profile.totalLikes', { count: profile.likeCount })}
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">{t('profile.songsTitle')}</h2>
        {profile.songs.length === 0 ? (
          <p className="hint">{t('profile.empty')}</p>
        ) : (
          <div className="my-song-list">
            {profile.songs.map((entry) => {
              const meta = contributorSongMeta(entry);
              const bpmDisplay = formatBpmSections(meta.sectionBpms);
              return (
                <article key={entry.id} className="my-song-card card">
                  <div className="my-song-card-header">
                    <div>
                      <h3 className="my-song-title">{entry.title}</h3>
                      <p className="my-song-meta">
                        {bpmDisplay} · {meta.sectionCount * 10}{t('common.seconds')}
                      </p>
                      <ContributorLinks
                        layers={entry.layers}
                        className="my-song-credits"
                      />
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
        )}
      </section>

      <Link to="/timeline" className="btn btn-secondary">{t('timeline.title')}</Link>
    </div>
  );
}
