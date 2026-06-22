import type { Song, Layer, SongWithLayers, FeedSong, StepPattern } from '@/types';
import {
  DEFAULT_AVATAR,
  DEFAULT_BPM,
  normalizeSongWithLayers,
  getEffectiveSectionCount,
  getSectionBpms,
  getSectionTotalSteps,
  resizeStepPattern,
} from '@/types';
import { getDefaultPattern } from '@/audio/engine';
import { getUsername, setUsername } from '@/lib/profile';

export { getUsername, setUsername };

const SONGS_KEY = 'tsugi-bato-songs';
const LAYERS_KEY = 'tsugi-bato-layers';
const LOCAL_FEED_KEY = 'tsugi-bato-local-feed';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getAllSongs(): Song[] {
  return loadJson<Song[]>(SONGS_KEY, []);
}

export function getAllLayers(): Layer[] {
  return loadJson<Layer[]>(LAYERS_KEY, []);
}

export function saveSong(song: Song): void {
  const songs = getAllSongs();
  const idx = songs.findIndex((s) => s.id === song.id);
  if (idx >= 0) songs[idx] = song;
  else songs.unshift(song);
  saveJson(SONGS_KEY, songs);
}

export function saveLayer(layer: Layer): void {
  const layers = getAllLayers();
  layers.push(layer);
  saveJson(LAYERS_KEY, layers);
}

export function updateLayer(layerId: string, updates: Partial<Layer>): void {
  const layers = getAllLayers();
  const idx = layers.findIndex((l) => l.id === layerId);
  if (idx >= 0) {
    layers[idx] = { ...layers[idx], ...updates };
    saveJson(LAYERS_KEY, layers);
  }
}

export function deleteLayer(layerId: string): void {
  const layers = getAllLayers().filter((l) => l.id !== layerId);
  saveJson(LAYERS_KEY, layers);
}

export function replaceAllLayers(layers: Layer[]): void {
  saveJson(LAYERS_KEY, layers);
}

export function replaceAllSongs(songs: Song[]): void {
  saveJson(SONGS_KEY, songs);
}

export function getSongById(id: string): Song | undefined {
  return getAllSongs().find((s) => s.id === id);
}

export function getSongByShareCode(code: string): Song | undefined {
  return getAllSongs().find((s) => s.shareCode === code.toUpperCase());
}

export function getLayersForSong(songId: string): Layer[] {
  return getAllLayers()
    .filter((l) => l.songId === songId)
    .sort((a, b) => a.contributorIndex - b.contributorIndex);
}

function fitLayerPattern(layer: Layer, sectionBpm: number): StepPattern | undefined {
  const totalSteps = getSectionTotalSteps(sectionBpm);
  const fallback = getDefaultPattern(layer.loopId);
  const base = layer.pattern?.length && layer.pattern.some(Boolean)
    ? layer.pattern
    : fallback;
  const sized = base.length === totalSteps ? base : resizeStepPattern(base, totalSteps);
  if (
    layer.pattern?.length === sized.length
    && layer.pattern.join('') === sized.join('')
  ) {
    return undefined;
  }
  return sized;
}

/** 旧 localStorage データのパターン・区間数を修復 */
export function migrateLegacyData(): void {
  const allLayers = getAllLayers();
  for (const layer of allLayers) {
    const song = getSongById(layer.songId);
    if (!song) continue;
    const sectionIndex = layer.sectionIndex ?? 0;
    const sectionBpm = song.sectionBpms?.[sectionIndex] ?? song.bpm ?? DEFAULT_BPM;
    const pattern = fitLayerPattern(layer, sectionBpm);
    const updates: Partial<Layer> = {};
    if (pattern) updates.pattern = pattern;
    if (layer.sectionIndex == null) updates.sectionIndex = 0;
    if (!layer.addMode) updates.addMode = layer.contributorIndex === 0 ? 'layer' : 'extend';
    if (Object.keys(updates).length > 0) {
      updateLayer(layer.id, updates);
    }
  }

  for (const song of getAllSongs()) {
    const layers = getLayersForSong(song.id);
    const sectionCount = getEffectiveSectionCount(song, layers);
    const sectionBpms = getSectionBpms({ ...song, sectionCount });
    const referenceBpm = song.referenceBpm ?? song.bpm ?? DEFAULT_BPM;
    const orphanedSession = song.activeContributorId
      && !layers.some((l) => !l.isVirtual && l.contributorId === song.activeContributorId);
    const needsSave = song.sectionCount !== sectionCount
      || !song.sectionBpms
      || song.referenceBpm == null
      || orphanedSession;
    if (!needsSave) continue;
    saveSong({
      ...song,
      sectionCount,
      sectionBpms,
      referenceBpm,
      activeContributorId: orphanedSession ? undefined : song.activeContributorId,
    });
  }
}

export function getSongWithLayers(id: string): SongWithLayers | undefined {
  const song = getSongById(id);
  if (!song) return undefined;
  return normalizeSongWithLayers({ ...song, layers: getLayersForSong(id) });
}

export function getSongWithLayersByCode(code: string): SongWithLayers | undefined {
  const song = getSongByShareCode(code);
  if (!song) return undefined;
  return normalizeSongWithLayers({ ...song, layers: getLayersForSong(song.id) });
}

export function getOpenSongs(): SongWithLayers[] {
  return getAllSongs()
    .filter((s) => s.status === 'open')
    .map((s) => normalizeSongWithLayers({ ...s, layers: getLayersForSong(s.id) }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getCompletedSongs(): SongWithLayers[] {
  return getAllSongs()
    .filter((s) => s.status === 'complete')
    .map((s) => normalizeSongWithLayers({ ...s, layers: getLayersForSong(s.id) }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function seedGlobalFeedDemo(): void {
  const feed = loadJson<FeedSong[]>(LOCAL_FEED_KEY, []);
  if (feed.some((f) => f.id === 'feed-demo-global-1')) return;

  const demos: FeedSong[] = [
    {
      id: 'feed-demo-global-1',
      shareCode: 'PHONK1',
      title: 'Midnight Cowbell',
      bpm: 145,
      mode: 'collab',
      creatorName: 'TokyoDrift',
      creatorAvatar: '🔥',
      completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      layers: [
        { id: 'fl1', songId: 'feed-demo-global-1', loopId: 'pad-kick-4', contributorName: 'TokyoDrift', contributorAvatar: '🔥', contributorIndex: 0, sectionIndex: 0, addMode: 'extend', isVirtual: false, addedAt: '' },
        { id: 'fl2', songId: 'feed-demo-global-1', loopId: 'pad-clap', contributorName: 'MemphisKid', contributorAvatar: '😎', contributorIndex: 1, sectionIndex: 0, addMode: 'layer', isVirtual: false, addedAt: '' },
        { id: 'fl3', songId: 'feed-demo-global-1', loopId: 'pad-snare', contributorName: '808Queen', contributorAvatar: '🌙', contributorIndex: 2, sectionIndex: 1, addMode: 'extend', isVirtual: false, addedAt: '' },
        { id: 'fl4', songId: 'feed-demo-global-1', loopId: 'pad-hat-cl', contributorName: 'DriftWolf', contributorAvatar: '🐺', contributorIndex: 3, sectionIndex: 1, addMode: 'layer', isVirtual: false, addedAt: '' },
      ],
    },
    {
      id: 'feed-demo-global-2',
      shareCode: 'PHONK2',
      title: 'Neon Sub Slide',
      bpm: 140,
      mode: 'collab',
      creatorName: 'BerlinGhost',
      creatorAvatar: '👻',
      completedAt: new Date(Date.now() - 86400000).toISOString(),
      layers: [
        { id: 'fl5', songId: 'feed-demo-global-2', loopId: 'pad-sub', contributorName: 'BerlinGhost', contributorAvatar: '👻', contributorIndex: 0, sectionIndex: 0, addMode: 'extend', isVirtual: false, addedAt: '' },
        { id: 'fl6', songId: 'feed-demo-global-2', loopId: 'pad-stab', contributorName: 'CowbellPro', contributorAvatar: '💀', contributorIndex: 1, sectionIndex: 0, addMode: 'layer', isVirtual: false, addedAt: '' },
        { id: 'fl7', songId: 'feed-demo-global-2', loopId: 'pad-ride', contributorName: 'PhonkCat', contributorAvatar: '🦊', contributorIndex: 2, sectionIndex: 1, addMode: 'extend', isVirtual: false, addedAt: '' },
      ],
    },
  ];

  saveJson(LOCAL_FEED_KEY, [...demos, ...feed]);
}

/** Seed demo songs for first-time users */
export function seedDemoData(): void {
  seedGlobalFeedDemo();

  if (getAllSongs().length > 0) return;

  const now = new Date().toISOString();
  const demoBpm = 140;
  const demoSong: Song = {
    id: 'demo-001',
    shareCode: 'DEMO01',
    title: 'Drift Waiting',
    bpm: demoBpm,
    referenceBpm: demoBpm,
    maxBars: 8,
    maxContributors: 6,
    status: 'open',
    mode: 'collab',
    createdAt: now,
    updatedAt: now,
    creatorName: 'Drift King',
    sectionCount: 1,
    sectionBpms: [demoBpm],
  };

  const demoLayer: Layer = {
    id: 'layer-demo-001',
    songId: 'demo-001',
    loopId: 'pad-kick-4',
    contributorName: 'Drift King',
    contributorAvatar: DEFAULT_AVATAR,
    contributorIndex: 0,
    sectionIndex: 0,
    addMode: 'layer',
    isVirtual: false,
    addedAt: now,
    pattern: resizeStepPattern(getDefaultPattern('pad-kick-4'), getSectionTotalSteps(demoBpm)),
  };

  saveSong(demoSong);
  saveLayer(demoLayer);
}
