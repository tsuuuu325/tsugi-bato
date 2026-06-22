import { useEffect, useState } from 'react';

import { useParams, Link } from 'react-router-dom';

import { SongEditor } from '@/components/SongEditor';

import { AddModePicker } from '@/components/AddModePicker';

import { useSongStore } from '@/store/songStore';

import {

  canAddLayer,

  canUserAddLayer,

  canUserExtendSection,

  getNextPartNumber,

  isPendingContributionModeChoice,

} from '@/types';

import type { LayerAddMode } from '@/types';

import { canUserContributeToday, getMaxSections, canStartDailyLayerSession, canStartDailyExtendSession } from '@/lib/plan';

import { useI18n } from '@/i18n/LocaleProvider';



export function AddLayerPage() {

  const { t, formatPart } = useI18n();

  const { code } = useParams<{ code: string }>();

  const init = useSongStore((s) => s.init);

  const loadSongByCode = useSongStore((s) => s.loadSongByCode);

  const deviceId = useSongStore((s) => s.deviceId);

  const [song, setSong] = useState(() => (code ? loadSongByCode(code) : null));

  const [chosenMode, setChosenMode] = useState<LayerAddMode | null>(null);



  useEffect(() => {

    init();

    if (code) setSong(loadSongByCode(code));

  }, [code, init, loadSongByCode]);



  if (!song) {

    return (

      <div className="page">

        <div className="empty-state">

          <p>{t('song.notFound')}</p>

          <Link to="/" className="btn btn-primary">{t('common.homeLink')}</Link>

        </div>

      </div>

    );

  }



  if (!canAddLayer(song, song.layers)) {

    return (

      <div className="page">

        <div className="empty-state">

          <p>{t('song.alreadyComplete')}</p>

          <Link to={`/song/${song.shareCode}`} className="btn btn-primary">{t('song.listenToSong')}</Link>

          <Link to="/timeline" className="btn btn-secondary">{t('common.timelineLink')} →</Link>

        </div>

      </div>

    );

  }



  const canJoin = canUserAddLayer(song, song.layers, deviceId)

    && canUserContributeToday(deviceId, song);

  const nextPart = getNextPartNumber(song.layers, song);

  const pendingModeChoice = isPendingContributionModeChoice(song, song.layers, deviceId);

  const maxSections = getMaxSections();

  const canExtend = canUserExtendSection(song, song.layers, deviceId, maxSections)
    && canStartDailyExtendSession();
  const canLayerDaily = canStartDailyLayerSession();



  if (!canJoin && canUserAddLayer(song, song.layers, deviceId) && !canUserContributeToday(deviceId, song)) {

    return (

      <div className="page">

        <div className="empty-state">

          <p>{t('plan.dailyBothExhausted')}</p>

          <Link to={`/song/${song.shareCode}`} className="btn btn-primary">{t('song.listenOnSongPage')}</Link>

          <Link to="/" className="btn btn-secondary">{t('common.homeLink')}</Link>

        </div>

      </div>

    );

  }



  if (!canJoin) {

    return (

      <div className="page">

        <div className="empty-state">

          <p>{t('song.cannotJoin')}</p>

          <p className="page-desc">

            {song.activeContributorId

              ? t('song.someoneAdding')

              : t('song.waitingForPart', { part: formatPart(nextPart) })}

          </p>

          <Link to={`/song/${song.shareCode}`} className="btn btn-primary">{t('song.listenOnSongPage')}</Link>

          <Link to="/collaborate" className="btn btn-secondary">{t('song.findOtherSongs')}</Link>

        </div>

      </div>

    );

  }



  if (pendingModeChoice && chosenMode == null) {

    return (

      <div className="page add-layer-page add-layer-page--pick-mode">

        <h1 className="page-title">{t('part.addPartTitle', { part: formatPart(nextPart) })}</h1>

        <p className="page-desc">

          {t('part.pickHowToAdd', {
            title: song.title,
            part: formatPart(nextPart),
          })}

        </p>

        <section className="card add-mode-step">

          <AddModePicker

            value={null}

            onChange={setChosenMode}

            currentSectionCount={song.sectionCount}
            canLayer={canLayerDaily}
            canExtend={canExtend}

          />

          <p className="hint hint--compact">{t('editor.pickModeHint')}</p>

        </section>

        <Link to={`/song/${song.shareCode}`} className="btn btn-secondary">

          {t('song.listenOnSongPage')}

        </Link>

      </div>

    );

  }



  return (

    <div className="page add-layer-page">

      <h1 className="page-title">{t('part.addPartTitle', { part: formatPart(nextPart) })}</h1>

      <p className="page-desc">

        {t('song.addLayerDesc', {

          title: song.title,

          creator: song.layers[0]?.contributorName ?? '?',

        })}

      </p>

      {pendingModeChoice && chosenMode != null && (

        <button

          type="button"

          className="btn btn-secondary btn-sm add-mode-back"

          onClick={() => setChosenMode(null)}

        >

          {t('part.changeAddMode')}

        </button>

      )}

      <SongEditor

        song={song}

        onSongUpdate={setSong}

        focusContinue

        initialAddMode={chosenMode}

      />

    </div>

  );

}


