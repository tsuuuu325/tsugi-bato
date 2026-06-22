import { useEffect, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { fetchComments, postComment } from '@/lib/feed';
import type { FeedComment } from '@/types';
import { useI18n } from '@/i18n/LocaleProvider';

interface CommentThreadProps {
  songId: string;
  username: string;
  avatarEmoji: string;
}

export function CommentThread({ songId, username, avatarEmoji }: CommentThreadProps) {
  const { t } = useI18n();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const list = await fetchComments(songId);
    setComments(list);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [songId]);

  const handleSubmit = async () => {
    if (!text.trim() || !username.trim()) return;
    const comment = await postComment(songId, username, avatarEmoji, text);
    setComments((prev) => [...prev, comment]);
    setText('');
  };

  return (
    <div className="comment-thread">
      <h3 className="comment-thread-title">{t('comment.title', { count: comments.length })}</h3>

      {loading ? (
        <p className="comment-empty">{t('common.loading')}</p>
      ) : comments.length === 0 ? (
        <p className="comment-empty">{t('comment.empty')}</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id} className="comment-item">
              <Avatar emoji={c.authorAvatar} size="sm" label={c.authorName} />
              <div className="comment-body">
                <span className="comment-author">{c.authorName}</span>
                <p className="comment-text">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="comment-form">
        <Avatar emoji={avatarEmoji} size="sm" label={username || t('app.guest')} />
        <input
          type="text"
          className="input comment-input"
          placeholder={username ? t('comment.placeholder') : t('comment.needName')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          disabled={!username.trim()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSubmit();
          }}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => void handleSubmit()}
          disabled={!text.trim() || !username.trim()}
        >
          {t('comment.send')}
        </button>
      </div>
    </div>
  );
}
