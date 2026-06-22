import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FeedCard } from '@/components/FeedCard';
import { useSongStore } from '@/store/songStore';
import { fetchFeedSongs, isFeedGlobal } from '@/lib/feed';
import type { FeedSong } from '@/types';
import { useI18n } from '@/i18n/LocaleProvider';

export function TimelinePage() {
  const { t, locale } = useI18n();
  const init = useSongStore((s) => s.init);
  const username = useSongStore((s) => s.username);
  const avatarEmoji = useSongStore((s) => s.avatarEmoji);
  const deviceId = useSongStore((s) => s.deviceId);
  const [feed, setFeed] = useState<FeedSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const songs = await fetchFeedSongs();
      setFeed(songs);
      setLoading(false);
    })();
  }, []);

  const dateLocale = locale === 'ja' ? 'ja-JP' : 'en-US';

  return (
    <div className="page timeline-page">
      <h1 className="page-title">{t('timeline.title')}</h1>
      <p className="page-desc">{t('timeline.desc')}</p>

      {!isFeedGlobal() && (
        <div className="alert-box alert-box--info">
          {t('timeline.localOnly')}
          {' '}
          <strong>{t('timeline.worldwide')}</strong>
          {' '}
          {t('timeline.localOnlyEnd')}
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <p>{t('common.loading')}</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="empty-state">
          <p>{t('timeline.empty')}</p>
          <Link to="/create" className="btn btn-primary">{t('timeline.startBeat')}</Link>
        </div>
      ) : (
        <div className="feed-list">
          {feed.map((song) => (
            <FeedCard
              key={song.id}
              song={song}
              username={username}
              avatarEmoji={avatarEmoji}
              deviceId={deviceId}
              dateLocale={dateLocale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
