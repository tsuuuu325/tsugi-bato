import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { CommentThread } from '@/components/CommentThread';
import { ReactionBar } from '@/components/ReactionBar';
import { Transport } from '@/components/Transport';
import { getPadById } from '@/data/loops';
import type { FeedSong } from '@/types';
import {
  getSongDurationFromSong,
  getReferenceBpm,
  getSectionBpms,
  getContributorCount,
} from '@/types';
import { useI18n } from '@/i18n/LocaleProvider';

interface FeedCardProps {
  song: FeedSong;
  username: string;
  avatarEmoji: string;
  deviceId: string;
  dateLocale?: string;
}

export function FeedCard({ song, username, avatarEmoji, deviceId, dateLocale = 'en-US' }: FeedCardProps) {
  const { t, formatPart, formatSection, formatBpmSections } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const sectionCount = Math.max(1, ...song.layers.map((l) => (l.sectionIndex ?? 0) + 1));
  const sectionBpms = song.sectionBpms ?? getSectionBpms({ bpm: song.bpm, sectionCount });
  const duration = getSongDurationFromSong({
    bpm: song.bpm,
    sectionCount,
    sectionBpms,
    referenceBpm: song.referenceBpm,
  });
  const contributorCount = getContributorCount(song.layers);
  const bpmDisplay = formatBpmSections(sectionBpms);

  return (
    <article className="feed-card">
      <header className="feed-card-header">
        <div className="feed-card-title-row">
          <Avatar emoji={song.creatorAvatar} size="lg" label={song.creatorName} />
          <div>
            <h2 className="feed-card-title">{song.title}</h2>
            <p className="feed-card-meta">
              {bpmDisplay} · {duration}{t('common.seconds')} · {t('timeline.completedBy', { count: contributorCount })} · {song.creatorName}
            </p>
          </div>
        </div>
        <time className="feed-card-time">
          {new Date(song.completedAt).toLocaleDateString(dateLocale)}
        </time>
      </header>

      <div className="feed-contributors">
        {song.layers.map((layer, i) => {
          const pad = getPadById(layer.loopId);
          return (
            <div key={layer.id} className="feed-contributor">
              <Avatar emoji={layer.contributorAvatar ?? '🎧'} size="sm" label={layer.contributorName} />
              <span className="feed-contributor-part">
                {formatPart(i + 1)} · {formatSection(layer.sectionIndex ?? 0)}
              </span>
              <span className="feed-contributor-pad" style={{ color: pad?.color }}>
                {pad?.shortLabel ?? '?'}
              </span>
              <span className="feed-contributor-name">{layer.contributorName}</span>
            </div>
          );
        })}
      </div>

      <Transport
        layers={song.layers}
        referenceBpm={getReferenceBpm(song)}
        sectionCount={sectionCount}
        sectionBpms={sectionBpms}
      />

      <ReactionBar
        songId={song.id}
        deviceId={deviceId}
        username={username}
        avatarEmoji={avatarEmoji}
      />

      <div className="feed-card-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t('feed.commentsClose') : t('feed.commentsOpen')}
        </button>
        <Link to={`/song/${song.shareCode}`} className="btn btn-primary btn-sm">
          {t('feed.songPage')}
        </Link>
      </div>

      {expanded && (
        <CommentThread songId={song.id} username={username} avatarEmoji={avatarEmoji} />
      )}
    </article>
  );
}
