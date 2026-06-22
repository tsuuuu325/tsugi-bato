import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSongStore } from '@/store/songStore';
import { canAddLayer, canUserAddLayer } from '@/types';
import { AVATAR_OPTIONS } from '@/types';
import { Avatar } from '@/components/Avatar';
import { useI18n } from '@/i18n/LocaleProvider';
import {
  remainingCreatedSongs,
  remainingDailyLayerSessions,
  remainingDailyExtendSessions,
  FREE_MAX_SECTIONS,
  FREE_MAX_CREATED_SONGS,
  FREE_DAILY_LAYER_SESSIONS,
  FREE_DAILY_EXTEND_SESSIONS,
  isProPlan,
  setUserPlan,
  resetFreePlanLimitsForTesting,
  canUserContributeToday,
} from '@/lib/plan';
import { isBillingConfigured } from '@/lib/billing';

export function HomePage() {
  const { t } = useI18n();
  const deviceId = useSongStore((s) => s.deviceId);
  const username = useSongStore((s) => s.username);
  const avatarEmoji = useSongStore((s) => s.avatarEmoji);
  const openSongs = useSongStore((s) => s.openSongs);
  const init = useSongStore((s) => s.init);
  const refreshLists = useSongStore((s) => s.refreshLists);
  const setUser = useSongStore((s) => s.setUser);
  const setAvatar = useSongStore((s) => s.setAvatar);
  const [searchParams, setSearchParams] = useSearchParams();
  const [nameInput, setNameInput] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const nameLocked = Boolean(username.trim());
  const remaining = remainingCreatedSongs(deviceId || '');
  const dailyLayerRemaining = remainingDailyLayerSessions();
  const dailyExtendRemaining = remainingDailyExtendSessions();
  const isPro = isProPlan();
  const billingReady = isBillingConfigured();

  useEffect(() => { init(); }, []);
  useEffect(() => {
    if (searchParams.get('resetLimits') !== '1' || !deviceId) return;
    resetFreePlanLimitsForTesting(deviceId);
    refreshLists();
    setResetMessage(t('plan.limitsResetDone'));
    searchParams.delete('resetLimits');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, deviceId, init, refreshLists, t]);
  useEffect(() => { if (username) setNameInput(username); }, [username]);

  const handleResetLimits = () => {
    if (!deviceId) return;
    resetFreePlanLimitsForTesting(deviceId);
    refreshLists();
    setResetMessage(t('plan.limitsResetDone'));
  };

  const handleSaveProfile = () => {
    if (nameLocked) return;
    if (nameInput.trim()) setUser(nameInput.trim(), avatarEmoji);
  };

  const mySoloSongs = openSongs.filter(
    (s) => s.mode === 'solo'
      && canAddLayer(s, s.layers)
      && canUserAddLayer(s, s.layers, deviceId)
      && canUserContributeToday(deviceId, s),
  );
  const waitingForMe = openSongs.filter(
    (s) => s.mode !== 'solo'
      && canAddLayer(s, s.layers)
      && canUserAddLayer(s, s.layers, deviceId)
      && canUserContributeToday(deviceId, s),
  );

  return (
    <div className="page home-page">
      <section className="hero">
        <h1 className="hero-title">{t('app.name')}</h1>
        <p className="hero-subtitle">{t('home.subtitle')}</p>
      </section>

      <section className="card profile-card">
        {nameLocked ? (
          <>
            <p className="label">{t('home.displayNameLocked')}</p>
            <div className="profile-preview profile-preview--locked">
              <Avatar emoji={avatarEmoji} size="md" label={username} />
              <span className="profile-locked-name">{username}</span>
            </div>
          </>
        ) : (
          <>
            <label className="label" htmlFor="username">{t('home.displayNameOnce')}</label>
            <div className="input-row">
              <input
                id="username"
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
        <p className="label label--sub">{t('home.avatarLabel')}</p>
        <div className="avatar-picker">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={`avatar-picker-btn ${avatarEmoji === emoji ? 'avatar-picker-btn--active' : ''}`}
              onClick={() => setAvatar(emoji)}
              aria-label={t('home.avatarAria', { emoji })}
            >
              {emoji}
            </button>
          ))}
        </div>
        {resetMessage && (
          <p className="hint hint--compact message-box message-box--ok">{resetMessage}</p>
        )}
        {!isPro && remaining != null && dailyLayerRemaining != null && dailyExtendRemaining != null && (
          <p className="hint hint--compact">
            {t('plan.quota', {
              remaining,
              max: FREE_MAX_CREATED_SONGS,
              sectionMax: FREE_MAX_SECTIONS,
              dailyLayerRemaining,
              dailyLayerMax: FREE_DAILY_LAYER_SESSIONS,
              dailyExtendRemaining,
              dailyExtendMax: FREE_DAILY_EXTEND_SESSIONS,
            })}
          </p>
        )}
        {isPro && (
          <p className="hint hint--compact">{t('plan.proLabel')} · {t('plan.proActiveHint')}</p>
        )}
        {billingReady ? (
          <Link to="/pro" className="btn btn-secondary btn-sm">
            {isPro ? t('billing.manage') : t('billing.upgrade')}
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setUserPlan(isPro ? 'free' : 'pro')}
          >
            {isPro ? t('plan.freeLabel') : t('plan.proTestToggle')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleResetLimits}
        >
          {t('plan.resetLimitsTest')}
        </button>
      </section>

      <Link to="/timeline" className="mode-card mode-card--timeline">
        <span className="mode-icon">🌍</span>
        <h2>{t('home.timelineTitle')}</h2>
        <p>{t('home.timelineDesc')}</p>
      </Link>

      <section className="mode-grid">
        <Link to="/create?solo=1" className="mode-card mode-card--solo">
          <span className="mode-icon">🎹</span>
          <h2>{t('home.soloTitle')}</h2>
          <p>{t('home.soloDesc')}</p>
        </Link>
        <Link to="/create" className="mode-card mode-card--create">
          <span className="mode-icon">🥁</span>
          <h2>{t('home.createTitle')}</h2>
          <p>{t('home.createDesc')}</p>
        </Link>
        <Link to="/collaborate" className="mode-card mode-card--collab">
          <span className="mode-icon">🤝</span>
          <h2>{t('home.collabTitle')}</h2>
          <p>{t('home.collabDesc')}</p>
        </Link>
        <Link to="/create?virtual=1" className="mode-card mode-card--virtual">
          <span className="mode-icon">👻</span>
          <h2>{t('home.virtualTitle')}</h2>
          <p>{t('home.virtualDesc')}</p>
        </Link>
      </section>

      {waitingForMe.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t('home.yourTurn')}</h2>
          <div className="song-list">
            {waitingForMe.slice(0, 5).map((song) => (
              <Link key={song.id} to={`/add/${song.shareCode}`} className="song-list-item song-list-item--continue">
                <div className="song-list-info">
                  <span className="song-list-title">{song.title}</span>
                  <span className="song-list-meta">
                    {t('part.responsible', { n: song.layers.length + 1 })} · {song.bpm} BPM
                  </span>
                </div>
                <span className="badge badge--continue">{t('common.join')}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {mySoloSongs.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t('home.soloContinue')}</h2>
          <div className="song-list">
            {mySoloSongs.map((song) => (
              <Link key={song.id} to={`/song/${song.shareCode}?continue=1`} className="song-list-item song-list-item--continue">
                <div className="song-list-info">
                  <span className="song-list-title">{song.title}</span>
                  <span className="song-list-meta">
                    {song.layers.length} {t('common.layers')} · {song.bpm} BPM
                  </span>
                </div>
                <span className="badge badge--continue">{t('common.continue')}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {openSongs.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t('home.waitingSongs')}</h2>
          <div className="song-list">
            {openSongs.slice(0, 5).map((song) => (
              <Link key={song.id} to={`/song/${song.shareCode}`} className="song-list-item">
                <div className="song-list-info">
                  <span className="song-list-title">{song.title}</span>
                  <span className="song-list-meta">
                    {song.layers.length} {t('common.layers')} · {song.bpm} BPM · {song.creatorName}
                  </span>
                </div>
                {canAddLayer(song, song.layers) && (
                  <span className="badge badge--open">
                    {t('part.waiting', { n: song.layers.length + 1 })}
                  </span>
                )}
              </Link>
            ))}
          </div>
          <Link to="/collaborate" className="link-more">{t('common.more')}</Link>
        </section>
      )}
    </div>
  );
}
