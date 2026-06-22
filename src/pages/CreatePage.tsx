import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DrumPadGrid } from '@/components/DrumPadGrid';
import { getFoundationPads, getPadById } from '@/data/loops';
import { useSongStore } from '@/store/songStore';
import { MIN_BPM, MAX_BPM, DEFAULT_BPM } from '@/types';
import { useI18n } from '@/i18n/LocaleProvider';
import {
  remainingCreatedSongs,
  remainingDailyLayerSessions,
  remainingDailyExtendSessions,
  FREE_MAX_CREATED_SONGS,
  FREE_DAILY_LAYER_SESSIONS,
  FREE_DAILY_EXTEND_SESSIONS,
  isProPlan,
  canStartDailyLayerSession,
} from '@/lib/plan';

export function CreatePage() {
  const { t, translateError } = useI18n();
  const deviceId = useSongStore((s) => s.deviceId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const init = useSongStore((s) => s.init);
  const createSong = useSongStore((s) => s.createSong);

  useEffect(() => { init(); }, []);

  const isSolo = searchParams.get('solo') === '1';
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [message, setMessage] = useState('');
  const [selectedPad, setSelectedPad] = useState<string | null>(null);
  const remaining = remainingCreatedSongs(deviceId || '');
  const dailyLayerRemaining = remainingDailyLayerSessions();
  const dailyExtendRemaining = remainingDailyExtendSessions();
  const foundationPads = useMemo(() => getFoundationPads(), []);
  const selectedInfo = selectedPad ? getPadById(selectedPad) : null;

  const handleCreate = () => {
    setMessage('');
    if (!selectedPad) {
      alert(t('create.pickFoundationAlert'));
      return;
    }
    if (!canStartDailyLayerSession()) {
      setMessage(`⚠️ ${translateError('dailyLayerSessionLimit')}`);
      return;
    }
    const mode = isSolo ? 'solo' : 'collab';

    const result = createSong({
      title: title || t('app.defaultBeatTitle'),
      bpm,
      foundationLoopId: selectedPad,
      mode,
    });
    if (!result.ok) {
      setMessage(`⚠️ ${translateError(result.reason)}`);
      return;
    }
    navigate(`/song/${result.song.shareCode}?continue=1`);
  };

  const pageTitle = isSolo ? t('create.soloTitle') : t('create.defaultTitle');

  return (
    <div className="page create-page">
      <h1 className="page-title">{pageTitle}</h1>
      <p className="page-desc">{t('create.desc')}</p>

      {!isProPlan() && remaining != null && dailyLayerRemaining != null && dailyExtendRemaining != null && (
        <p className="hint hint--compact">
          {t('plan.quota', {
            remaining,
            max: FREE_MAX_CREATED_SONGS,
            dailyLayerRemaining,
            dailyLayerMax: FREE_DAILY_LAYER_SESSIONS,
            dailyExtendRemaining,
            dailyExtendMax: FREE_DAILY_EXTEND_SESSIONS,
          })}
          {' · '}
          {t('plan.timelinePublishHint')}
        </p>
      )}

      {message && (
        <div className="message-box message-box--warn">{message}</div>
      )}

      <section className="card">
        <label className="label" htmlFor="title">{t('create.songTitle')}</label>
        <input id="title" type="text" className="input" placeholder={t('app.defaultBeatTitle')} value={title}
          onChange={(e) => setTitle(e.target.value)} maxLength={40} />
        <p className="hint hint--compact">{t('create.songTitleHint')}</p>
        <label className="label" htmlFor="bpm">{t('create.bpmLabel', { min: MIN_BPM, max: MAX_BPM })}</label>
        <div className="bpm-control">
          <input id="bpm" type="range" min={MIN_BPM} max={MAX_BPM} value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))} />
          <span className="bpm-value">{bpm}</span>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t('create.firstPad')}</h2>
        <DrumPadGrid pads={foundationPads} selectedId={selectedPad} onSelect={setSelectedPad} columns={2} />
      </section>

      <button type="button" className="btn btn-primary btn-large" onClick={handleCreate}>
        {selectedInfo
          ? t('create.startWithPad', { pad: selectedInfo.shortLabel })
          : t('create.pickPadToStart')}
      </button>
    </div>
  );
}
