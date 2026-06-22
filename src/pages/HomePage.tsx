import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { useSongStore } from '@/store/songStore';

import { canAddLayer, canUserAddLayer } from '@/types';

import { useI18n } from '@/i18n/LocaleProvider';

import { getLayersForSong } from '@/lib/storage';

import {

  remainingCreatedSongs,

  remainingDailyLayerSessions,

  remainingDailyExtendSessions,

  FREE_MAX_CREATED_SONGS,

  FREE_DAILY_LAYER_SESSIONS,

  FREE_DAILY_EXTEND_SESSIONS,

  isProPlan,

  canUserContributeToday,

} from '@/lib/plan';



export function HomePage() {

  const { t } = useI18n();

  const deviceId = useSongStore((s) => s.deviceId);

  const username = useSongStore((s) => s.username);

  const openSongs = useSongStore((s) => s.openSongs);

  const exampleSongs = useSongStore((s) => s.exampleSongs);

  const init = useSongStore((s) => s.init);

  const setUser = useSongStore((s) => s.setUser);

  const [nameInput, setNameInput] = useState('');

  const nameLocked = Boolean(username.trim());

  const remaining = remainingCreatedSongs(deviceId || '');

  const dailyLayerRemaining = remainingDailyLayerSessions();

  const dailyExtendRemaining = remainingDailyExtendSessions();

  const isPro = isProPlan();



  useEffect(() => { init(); }, []);

  useEffect(() => { if (username) setNameInput(username); }, [username]);



  const handleSaveProfile = () => {

    if (nameLocked) return;

    if (nameInput.trim()) setUser(nameInput.trim());

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



      <section className="card profile-card profile-card--simple">

        {nameLocked ? (

          <div className="profile-row">

            <div>

              <p className="label">{t('home.displayNameLocked')}</p>

              <p className="profile-locked-name">{username}</p>

            </div>

            <Link to="/me" className="btn btn-secondary btn-sm">{t('nav.myPage')}</Link>

          </div>

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

        {!isPro && remaining != null && dailyLayerRemaining != null && dailyExtendRemaining != null && (

          <p className="hint hint--compact">

            {t('plan.quota', {

              remaining,

              max: FREE_MAX_CREATED_SONGS,

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

        <Link to="/pro" className="btn btn-secondary btn-sm">

          {isPro ? t('billing.manage') : t('billing.upgrade')}

        </Link>

      </section>



      <Link to="/timeline" className="mode-card mode-card--timeline">

        <span className="mode-icon">🌍</span>

        <h2>{t('home.timelineTitle')}</h2>

        <p>{t('home.timelineDesc')}</p>

      </Link>



      {exampleSongs.length > 0 && (

        <section className="section example-section">

          <h2 className="section-title">{t('home.examplesTitle')}</h2>

          <p className="hint hint--compact example-section-desc">{t('home.examplesDesc')}</p>

          <div className="example-list">

            {exampleSongs.map((song) => {

              const layers = getLayersForSong(song.id);

              return (

                <Link

                  key={song.id}

                  to={`/song/${song.shareCode}`}

                  className="example-card"

                >

                  <div className="example-card-glow" aria-hidden />

                  <span className="badge badge--example example-card-badge">{t('home.exampleBadge')}</span>

                  <span className="example-icon">🔥</span>

                  <div className="example-card-body">

                    <span className="example-card-title">{song.title}</span>

                    <span className="example-card-meta">

                      {t('home.exampleVolentoMeta', {

                        bpm: song.bpm,

                        layers: layers.length,

                        sections: song.sectionCount,

                      })}

                    </span>

                  </div>

                </Link>

              );

            })}

          </div>

        </section>

      )}



      <section className="mode-grid">

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

        <Link to="/create?solo=1" className="mode-card mode-card--solo">

          <span className="mode-icon">🎹</span>

          <h2>{t('home.soloTitle')}</h2>

          <p>{t('home.soloDesc')}</p>

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


