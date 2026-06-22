import { useEffect, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { fetchReactions, toggleReaction } from '@/lib/feed';
import type { FeedReaction } from '@/types';
import { useI18n } from '@/i18n/LocaleProvider';

interface ReactionBarProps {
  songId: string;
  deviceId: string;
  username: string;
  avatarEmoji: string;
}

const MAX_AVATARS = 8;

export function ReactionBar({ songId, deviceId, username, avatarEmoji }: ReactionBarProps) {
  const { t } = useI18n();
  const [reactions, setReactions] = useState<FeedReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const list = await fetchReactions(songId);
    setReactions(list);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [songId]);

  const mine = reactions.find((r) => r.deviceId === deviceId);
  const count = reactions.length;
  const canReact = Boolean(username.trim() && deviceId);

  const handleToggle = async () => {
    if (!canReact || busy) return;
    setBusy(true);
    const result = await toggleReaction(songId, deviceId, username, avatarEmoji);
    setReactions(result.reactions);
    setBusy(false);
  };

  return (
    <div className="reaction-bar">
      <button
        type="button"
        className={`reaction-btn${mine ? ' reaction-btn--active' : ''}`}
        onClick={() => void handleToggle()}
        disabled={!canReact || busy || loading}
        aria-pressed={Boolean(mine)}
        aria-label={mine ? t('reaction.unlike') : t('reaction.likeAria')}
      >
        <span className="reaction-btn-icon" aria-hidden>❤️</span>
        <span className="reaction-btn-label">{t('reaction.like')}</span>
        <span className="reaction-btn-count">{loading ? '…' : count}</span>
      </button>

      {!canReact && (
        <p className="reaction-hint">{t('reaction.hint')}</p>
      )}

      {count > 0 && (
        <div className="reaction-faces">
          <span className="reaction-faces-label">{t('reaction.count', { count })}</span>
          <div className="reaction-avatar-row">
            {reactions.slice(0, MAX_AVATARS).map((r) => (
              <Avatar key={r.id} emoji={r.authorAvatar} size="sm" label={r.authorName} />
            ))}
            {count > MAX_AVATARS && (
              <span className="reaction-more">+{count - MAX_AVATARS}</span>
            )}
          </div>
          <ul className="reaction-name-list">
            {reactions.map((r) => (
              <li key={r.id}>
                <span className="reaction-name-emoji">{r.authorAvatar}</span>
                <span className="reaction-name-text">{r.authorName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
