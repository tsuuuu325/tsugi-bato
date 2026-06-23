import { useI18n } from '@/i18n/LocaleProvider';
import { getShareUrlWithSync } from '@/lib/deviceSync';

interface ShareButtonProps {
  shareCode: string;
  title: string;
}

export function ShareButton({ shareCode, title }: ShareButtonProps) {
  const { t } = useI18n();
  const url = getShareUrlWithSync(`/s/${shareCode}`);
  const text = t('share.tweet', { title });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert(t('share.copied'));
    } catch {
      prompt(t('share.copyPrompt'), url);
    }
  };

  const shareTwitter = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, '_blank', 'noopener');
  };

  return (
    <div className="share-section">
      <div className="share-code">
        <span className="share-label">{t('share.code')}</span>
        <span className="share-value">{shareCode}</span>
      </div>
      <div className="share-actions">
        <button type="button" className="btn btn-secondary" onClick={copyLink}>
          {t('share.copyLink')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={shareTwitter}>
          {t('share.shareX')}
        </button>
      </div>
    </div>
  );
}
